import { Suspense } from "react";

import {
  ensureEnvCredentialTable,
  markCredentialTableViewed,
} from "@/app/credentials/actions";
import { EnvCredentialsManager } from "@/components/credentials/env-credentials-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientCredential, CredentialClient } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EnvPage() {
  let credentials: ClientCredential[] = [];
  let clients: CredentialClient[] = [];
  let loadError: string | null = null;

  const ensured = await ensureEnvCredentialTable();

  if (ensured.error || !ensured.table) {
    loadError = ensured.error ?? "לא ניתן להכין את טבלת ENV";
  } else {
    const table = ensured.table;

    try {
      const supabase = createAdminClient();

      const [credentialsResult, clientsResult] = await Promise.all([
        supabase
          .from("client_credentials")
          .select("*")
          .eq("table_id", table.id)
          .order("client_name", { ascending: true }),
        supabase
          .from("credential_clients")
          .select("*")
          .order("name", { ascending: true }),
      ]);

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

      await markCredentialTableViewed(table.id);
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : "שגיאה בטעינת ENV";
    }
  }

  const table = ensured.table;

  if (!table && !loadError) {
    loadError = "לא ניתן לטעון את עמוד ENV";
  }

  return (
    <>
      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">לא ניתן לטעון נתונים</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : table ? (
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
              טוען ENV...
            </div>
          }
        >
          <EnvCredentialsManager
            table={table}
            initialCredentials={credentials}
            initialClients={clients}
          />
        </Suspense>
      ) : null}
    </>
  );
}
