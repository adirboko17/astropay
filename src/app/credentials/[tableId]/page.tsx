import { notFound } from "next/navigation";
import { Suspense } from "react";

import { markCredentialTableViewed } from "@/app/credentials/actions";
import { CredentialsManager } from "@/components/credentials/credentials-manager";
import { AppShell } from "@/components/layout/app-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientCredential, CredentialClient, CredentialTable } from "@/types/database";

export const dynamic = "force-dynamic";

interface TablePageProps {
  params: Promise<{ tableId: string }>;
}

export default async function CredentialTablePage({ params }: TablePageProps) {
  const { tableId } = await params;
  let table: CredentialTable | null = null;
  let credentials: ClientCredential[] = [];
  let tables: CredentialTable[] = [];
  let clients: CredentialClient[] = [];
  let loadError: string | null = null;

  try {
    const supabase = createAdminClient();

    const [tableResult, tablesResult, credentialsResult, clientsResult] =
      await Promise.all([
        supabase
          .from("credential_tables")
          .select("*")
          .eq("id", tableId)
          .maybeSingle(),
        supabase.from("credential_tables").select("*").order("name", {
          ascending: true,
        }),
        supabase
          .from("client_credentials")
          .select("*")
          .eq("table_id", tableId)
          .order("client_name", { ascending: true }),
        supabase
          .from("credential_clients")
          .select("*")
          .order("name", { ascending: true }),
      ]);

    if (tableResult.error) {
      loadError = tableResult.error.message;
    } else if (!tableResult.data) {
      notFound();
    } else {
      table = tableResult.data;
    }

    if (tablesResult.error) {
      loadError = tablesResult.error.message;
    } else {
      tables = tablesResult.data ?? [];
    }

    if (credentialsResult.error) {
      loadError = credentialsResult.error.message;
    } else {
      credentials = credentialsResult.data ?? [];
    }

    if (clientsResult.error) {
      loadError = clientsResult.error.message;
    } else {
      clients = clientsResult.data ?? [];
    }
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "שגיאה בטעינת פרטי ההתחברות";
  }

  if (!table) {
    notFound();
  }

  await markCredentialTableViewed(tableId);

  return (
    <AppShell wide hideHeader title={table.name} description="רשומות ופרטי התחברות">
      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">לא ניתן לטעון נתונים</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
              טוען רשומות...
            </div>
          }
        >
          <CredentialsManager
            table={table}
            initialCredentials={credentials}
            initialTables={tables}
            initialClients={clients}
          />
        </Suspense>
      )}
    </AppShell>
  );
}
