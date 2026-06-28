import { Suspense } from "react";

import { CredentialsManager } from "@/components/credentials/credentials-manager";
import { AppShell } from "@/components/layout/app-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientCredential, CredentialClient, CredentialTable } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function CredentialsPage() {
  let credentials: ClientCredential[] = [];
  let tables: CredentialTable[] = [];
  let clients: CredentialClient[] = [];
  let loadError: string | null = null;

  try {
    const supabase = createAdminClient();

    const [tablesResult, credentialsResult, clientsResult] = await Promise.all([
      supabase.from("credential_tables").select("*").order("name", {
        ascending: true,
      }),
      supabase
        .from("client_credentials")
        .select("*")
        .order("client_name", { ascending: true }),
      supabase
        .from("credential_clients")
        .select("*")
        .order("name", { ascending: true }),
    ]);

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

  return (
    <AppShell
      wide
      title="פרטי התחברות"
      description="צור טבלאות משלך ונהל בהן את כל פרטי ההתחברות של הלקוחות"
    >
      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">לא ניתן לטעון נתונים</p>
          <p className="mt-1">{loadError}</p>
          <p className="mt-2 text-xs">
            הוסף ל-<code className="rounded bg-amber-100 px-1">.env.local</code>{" "}
            את{" "}
            <code className="rounded bg-amber-100 px-1">
              SUPABASE_SERVICE_ROLE_KEY
            </code>{" "}
            (מ-Supabase Dashboard → Settings → API)
          </p>
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
              טוען טבלאות...
            </div>
          }
        >
          <CredentialsManager
            initialCredentials={credentials}
            initialTables={tables}
            initialClients={clients}
          />
        </Suspense>
      )}
    </AppShell>
  );
}
