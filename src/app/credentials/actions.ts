"use server";

import { revalidatePath } from "next/cache";

import type { CredentialFormData } from "@/lib/credentials/constants";
import {
  ENV_TABLE_NAME,
  isEnvTable,
  isReservedEnvTableName,
} from "@/lib/credentials/env-table";
import { createAdminClient } from "@/lib/supabase/admin";

function revalidateCredentialAreas() {
  revalidatePath("/credentials", "layout");
  revalidatePath("/env", "layout");
}

export async function ensureEnvCredentialTable() {
  try {
    const supabase = createAdminClient();
    const { data: tables, error: listError } = await supabase
      .from("credential_tables")
      .select("*");

    if (listError) {
      return { table: null, error: listError.message };
    }

    const existing = tables?.find((table) => isEnvTable(table.name));
    if (existing) {
      return { table: existing, error: null };
    }

    const { data: created, error: createError } = await supabase
      .from("credential_tables")
      .insert({ name: ENV_TABLE_NAME })
      .select("*")
      .single();

    if (createError) {
      return { table: null, error: createError.message };
    }

    revalidateCredentialAreas();
    return { table: created, error: null };
  } catch (error) {
    return {
      table: null,
      error:
        error instanceof Error ? error.message : "שגיאה בהכנת טבלת ENV",
    };
  }
}

async function resolveTableName(tableId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("credential_tables")
    .select("name")
    .eq("id", tableId)
    .single();

  if (error || !data) {
    throw new Error("הטבלה שנבחרה לא נמצאה");
  }

  return data.name;
}

async function resolveClient(
  clientId: string | null | undefined,
  clientName: string,
) {
  const supabase = createAdminClient();

  if (clientId) {
    const { data, error } = await supabase
      .from("credential_clients")
      .select("id, name")
      .eq("id", clientId)
      .single();

    if (error || !data) {
      return { error: "הלקוח שנבחר לא נמצא" } as const;
    }

    const trimmedName = clientName.trim() || data.name;

    if (trimmedName !== data.name) {
      const { error: updateClientError } = await supabase
        .from("credential_clients")
        .update({ name: trimmedName })
        .eq("id", clientId);

      if (updateClientError) {
        return { error: updateClientError.message } as const;
      }

      const { error: updateCredentialsError } = await supabase
        .from("client_credentials")
        .update({ client_name: trimmedName })
        .eq("client_id", clientId);

      if (updateCredentialsError) {
        return { error: updateCredentialsError.message } as const;
      }

      return { id: clientId, name: trimmedName } as const;
    }

    return { id: data.id, name: data.name } as const;
  }

  const trimmedName = clientName.trim();
  if (!trimmedName) {
    return { error: "שם לקוח הוא שדה חובה" } as const;
  }

  const { data: existingClients, error: listError } = await supabase
    .from("credential_clients")
    .select("id, name");

  if (listError) {
    return { error: listError.message } as const;
  }

  const existing = existingClients?.find(
    (client) => client.name.trim().toLowerCase() === trimmedName.toLowerCase(),
  );

  if (existing) {
    return { id: existing.id, name: existing.name } as const;
  }

  const { data: created, error: createError } = await supabase
    .from("credential_clients")
    .insert({ name: trimmedName })
    .select("id, name")
    .single();

  if (createError) {
    return { error: createError.message } as const;
  }

  return { id: created.id, name: created.name } as const;
}

function normalizeNotes(notes: string, tableName: string) {
  if (isEnvTable(tableName)) {
    return notes.length > 0 ? notes : null;
  }

  return notes.trim() || null;
}

function normalizeCredentialInput(
  data: CredentialFormData,
  tableId: string,
  tableName: string,
  clientId: string,
  clientName: string,
) {
  return {
    table_id: tableId,
    client_id: clientId,
    client_name: clientName,
    platform: tableName,
    service_label: null,
    login_email: data.login_email.trim() || null,
    login_username: data.login_username.trim() || null,
    password: data.password || null,
    dashboard_url: null,
    website_url: data.website_url.trim() || null,
    notes: normalizeNotes(data.notes, tableName),
  };
}

export type CreateCredentialTableState = {
  error: string | null;
  id: string | null;
  name: string | null;
};

export async function createCredentialTableFormAction(
  _prevState: CreateCredentialTableState,
  formData: FormData,
): Promise<CreateCredentialTableState> {
  const trimmedName = String(formData.get("name") ?? "").trim();

  if (!trimmedName) {
    return { error: "שם הטבלה הוא שדה חובה", id: null, name: null };
  }

  const result = await createCredentialTable(trimmedName);

  if (result.error) {
    return { error: result.error, id: null, name: null };
  }

  if (!result.id) {
    return { error: "יצירת הטבלה נכשלה — נסה שוב", id: null, name: null };
  }

  return { error: null, id: result.id, name: trimmedName };
}

export async function createCredentialTable(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { error: "שם הטבלה הוא שדה חובה" };
  }

  if (isReservedEnvTableName(trimmedName)) {
    return {
      error: 'שם "ENV" שמור — השתמש בפריט ENV בתפריט הצד',
    };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("credential_tables")
      .insert({ name: trimmedName })
      .select("id")
      .single();

    if (error) return { error: error.message };

    revalidateCredentialAreas();
    return { success: true, id: data.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה ביצירת הטבלה",
    };
  }
}

export async function createCredential(
  data: CredentialFormData,
  tableId: string,
  clientId?: string | null,
) {
  if (!tableId) {
    return { error: "יש לבחור טבלה לפני הוספת רשומה" };
  }

  try {
    const client = await resolveClient(clientId, data.client_name);
    if ("error" in client) return { error: client.error };

    const tableName = await resolveTableName(tableId);
    const supabase = createAdminClient();
    const { data: created, error } = await supabase
      .from("client_credentials")
      .insert(
        normalizeCredentialInput(
          data,
          tableId,
          tableName,
          client.id,
          client.name,
        ),
      )
      .select("*")
      .single();

    if (error) return { error: error.message };

    revalidateCredentialAreas();
    return { success: true, clientId: client.id, credential: created };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה ביצירת הרשומה",
    };
  }
}

export async function updateCredential(
  id: string,
  data: CredentialFormData,
  tableId: string | null,
  clientId?: string | null,
) {
  try {
    const client = await resolveClient(clientId, data.client_name);
    if ("error" in client) return { error: client.error };

    const supabase = createAdminClient();

    let tableName: string | null = null;

    if (tableId) {
      tableName = await resolveTableName(tableId);
    }

    const updatePayload: {
      client_id: string;
      client_name: string;
      login_email: string | null;
      login_username: string | null;
      password: string | null;
      website_url: string | null;
      notes: string | null;
      table_id?: string;
      platform?: string;
    } = {
      client_id: client.id,
      client_name: client.name,
      login_email: data.login_email.trim() || null,
      login_username: data.login_username.trim() || null,
      password: data.password || null,
      website_url: data.website_url.trim() || null,
      notes: normalizeNotes(data.notes, tableName ?? ""),
    };

    if (tableId && tableName) {
      updatePayload.table_id = tableId;
      updatePayload.platform = tableName;
    }

    const { error } = await supabase
      .from("client_credentials")
      .update(updatePayload)
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateCredentialAreas();
    return { success: true, clientId: client.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בעדכון הרשומה",
    };
  }
}

export async function deleteCredential(id: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("client_credentials")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateCredentialAreas();
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה במחיקת הרשומה",
    };
  }
}

export async function updateCredentialTableName(id: string, name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { error: "שם הטבלה הוא שדה חובה" };
  }

  if (isReservedEnvTableName(trimmedName)) {
    return {
      error: 'שם "ENV" שמור — השתמש בפריט ENV בתפריט הצד',
    };
  }

  try {
    const supabase = createAdminClient();

    const { data: existingTable, error: existingError } = await supabase
      .from("credential_tables")
      .select("name")
      .eq("id", id)
      .single();

    if (existingError || !existingTable) {
      return { error: "הטבלה לא נמצאה" };
    }

    if (isEnvTable(existingTable.name)) {
      return { error: "לא ניתן לשנות את שם טבלת ENV" };
    }

    const { error: tableError } = await supabase
      .from("credential_tables")
      .update({ name: trimmedName })
      .eq("id", id);

    if (tableError) return { error: tableError.message };

    const { error: credentialsError } = await supabase
      .from("client_credentials")
      .update({ platform: trimmedName })
      .eq("table_id", id);

    if (credentialsError) return { error: credentialsError.message };

    revalidateCredentialAreas();
    revalidatePath(`/credentials/${id}`, "layout");
    return { success: true as const };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "שגיאה בעדכון שם הטבלה",
    };
  }
}

export async function deleteCredentialTable(id: string) {
  try {
    const supabase = createAdminClient();

    const { data: existingTable, error: existingError } = await supabase
      .from("credential_tables")
      .select("name")
      .eq("id", id)
      .single();

    if (existingError || !existingTable) {
      return { error: "הטבלה לא נמצאה" };
    }

    if (isEnvTable(existingTable.name)) {
      return { error: "לא ניתן למחוק את טבלת ENV" };
    }

    const { error } = await supabase
      .from("credential_tables")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateCredentialAreas();
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה במחיקת הטבלה",
    };
  }
}

export async function updateCredentialClientName(clientId: string, name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { error: "שם הלקוח הוא שדה חובה" };
  }

  try {
    const supabase = createAdminClient();

    const { error: clientError } = await supabase
      .from("credential_clients")
      .update({ name: trimmedName })
      .eq("id", clientId);

    if (clientError) return { error: clientError.message };

    const { error: credentialsError } = await supabase
      .from("client_credentials")
      .update({ client_name: trimmedName })
      .eq("client_id", clientId);

    if (credentialsError) return { error: credentialsError.message };

    revalidateCredentialAreas();
    return { success: true as const, name: trimmedName };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "שגיאה בעדכון שם הלקוח",
    };
  }
}

export async function markCredentialTableViewed(tableId: string) {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("credential_tables")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", tableId);

    if (error) {
      return { error: error.message };
    }

    revalidateCredentialAreas();
    return { success: true as const };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "שגיאה בעדכון צפייה אחרונה",
    };
  }
}
