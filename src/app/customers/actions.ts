"use server";

import { revalidatePath } from "next/cache";

import type { CustomerFormData } from "@/lib/customers/constants";
import { createAdminClient } from "@/lib/supabase/admin";

function revalidateCustomerPaths(customerId?: string) {
  revalidatePath("/customers", "layout");
  revalidatePath("/projects", "layout");
  revalidatePath("/collections", "layout");
  if (customerId) {
    revalidatePath(`/customers/${customerId}`, "layout");
  }
}

function normalizeCustomerInput(data: CustomerFormData) {
  const parsedAmount = Number.parseFloat(data.total_amount_due);

  return {
    name: data.name.trim(),
    email: data.email.trim() || null,
    phone: data.phone.trim() || null,
    company: data.company.trim() || null,
    status: data.status || "active",
    notes: data.notes.trim() || null,
    total_amount_due: Number.isFinite(parsedAmount) ? parsedAmount : 0,
    currency: data.currency.trim() || "ILS",
  };
}

export async function createCustomer(data: CustomerFormData) {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    return { error: "שם הלקוח הוא שדה חובה" };
  }

  try {
    const supabase = createAdminClient();
    const { data: created, error } = await supabase
      .from("credential_clients")
      .insert(normalizeCustomerInput(data))
      .select("*")
      .single();

    if (error) return { error: error.message };

    revalidateCustomerPaths(created.id);
    return { success: true as const, id: created.id, customer: created };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה ביצירת הלקוח",
    };
  }
}

export async function createProject(data: CustomerFormData) {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    return { error: "שם הפרויקט הוא שדה חובה" };
  }

  try {
    const supabase = createAdminClient();
    const normalized = normalizeCustomerInput(data);
    const { data: created, error } = await supabase
      .from("credential_clients")
      .insert({ ...normalized, total_amount_due: 0 })
      .select("*")
      .single();

    if (error) return { error: error.message };

    revalidateCustomerPaths(created.id);
    return { success: true as const, id: created.id, customer: created };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה ביצירת הפרויקט",
    };
  }
}

export async function updateCustomer(id: string, data: CustomerFormData) {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    return { error: "שם הלקוח הוא שדה חובה" };
  }

  try {
    const supabase = createAdminClient();
    const payload = normalizeCustomerInput(data);

    const { error } = await supabase
      .from("credential_clients")
      .update(payload)
      .eq("id", id);

    if (error) return { error: error.message };

    if (payload.name) {
      await supabase
        .from("client_credentials")
        .update({ client_name: payload.name })
        .eq("client_id", id);
    }

    revalidateCustomerPaths(id);
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בעדכון הלקוח",
    };
  }
}

export async function deleteCustomer(id: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("credential_clients").delete().eq("id", id);

    if (error) return { error: error.message };

    revalidateCustomerPaths();
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה במחיקת הלקוח",
    };
  }
}

export interface PaymentFormData {
  amount: string;
  currency: string;
  paid_at: string;
  method: string;
  note: string;
  charge_id: string;
}

function normalizePaymentInput(customerId: string, data: PaymentFormData) {
  const amount = Number.parseFloat(data.amount);

  return {
    customer_id: customerId,
    charge_id: data.charge_id || null,
    amount: Number.isFinite(amount) ? amount : 0,
    currency: data.currency.trim() || "ILS",
    paid_at: data.paid_at || new Date().toISOString().slice(0, 10),
    method: data.method.trim() || null,
    note: data.note.trim() || null,
  };
}

export async function createPayment(customerId: string, data: PaymentFormData) {
  const amount = Number.parseFloat(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "יש להזין סכום תשלום חיובי" };
  }

  try {
    const supabase = createAdminClient();
    const { data: created, error } = await supabase
      .from("customer_payments")
      .insert(normalizePaymentInput(customerId, data))
      .select("*")
      .single();

    if (error) return { error: error.message };

    revalidateCustomerPaths(customerId);
    return { success: true as const, payment: created };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בהוספת התשלום",
    };
  }
}

export async function updatePayment(
  id: string,
  customerId: string,
  data: PaymentFormData,
) {
  const amount = Number.parseFloat(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "יש להזין סכום תשלום חיובי" };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("customer_payments")
      .update(normalizePaymentInput(customerId, data))
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateCustomerPaths(customerId);
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בעדכון התשלום",
    };
  }
}

export async function deletePayment(id: string, customerId: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("customer_payments").delete().eq("id", id);

    if (error) return { error: error.message };

    revalidateCustomerPaths(customerId);
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה במחיקת התשלום",
    };
  }
}

export async function linkRecurringClient(customerId: string, recurringClientId: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("recurring_clients")
      .update({ customer_id: customerId })
      .eq("id", recurringClientId);

    if (error) return { error: error.message };

    revalidateCustomerPaths(customerId);
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בקישור הוראת הקבע",
    };
  }
}

export interface ChargeFormData {
  title: string;
  amount: string;
  currency: string;
  notes: string;
}

function normalizeChargeInput(customerId: string, data: ChargeFormData) {
  const amount = Number.parseFloat(data.amount);

  return {
    customer_id: customerId,
    title: data.title.trim(),
    amount: Number.isFinite(amount) ? amount : 0,
    currency: data.currency.trim() || "ILS",
    notes: data.notes.trim() || null,
  };
}

export async function createCharge(customerId: string, data: ChargeFormData) {
  if (!data.title.trim()) {
    return { error: "יש להזין שם לשירות / חיוב" };
  }

  try {
    const supabase = createAdminClient();
    const { data: created, error } = await supabase
      .from("customer_charges")
      .insert(normalizeChargeInput(customerId, data))
      .select("*")
      .single();

    if (error) return { error: error.message };

    revalidateCustomerPaths(customerId);
    return { success: true as const, charge: created };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בהוספת החיוב",
    };
  }
}

export async function updateCharge(
  id: string,
  customerId: string,
  data: ChargeFormData,
) {
  if (!data.title.trim()) {
    return { error: "יש להזין שם לשירות / חיוב" };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("customer_charges")
      .update(normalizeChargeInput(customerId, data))
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateCustomerPaths(customerId);
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בעדכון החיוב",
    };
  }
}

export async function deleteCharge(id: string, customerId: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("customer_charges").delete().eq("id", id);

    if (error) return { error: error.message };

    revalidateCustomerPaths(customerId);
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה במחיקת החיוב",
    };
  }
}

export async function unlinkRecurringClient(customerId: string, recurringClientId: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("recurring_clients")
      .update({ customer_id: null })
      .eq("id", recurringClientId);

    if (error) return { error: error.message };

    revalidateCustomerPaths(customerId);
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בביטול קישור הוראת הקבע",
    };
  }
}
