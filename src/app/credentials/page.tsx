import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CredentialsTablesHome } from "@/components/credentials/credentials-tables-home";
import { AppShell } from "@/components/layout/app-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientCredential, CredentialTable } from "@/types/database";

export const dynamic = "force-dynamic";

interface CredentialsPageProps {
  searchParams: Promise<{ table?: string }>;
}

export default async function CredentialsPage({ searchParams }: CredentialsPageProps) {
  const { table: tableId } = await searchParams;

  if (tableId) {
    redirect(`/credentials/${tableId}`);
  }

  let credentials: Pick<ClientCredential, "table_id">[] = [];
  let tables: CredentialTable[] = [];
  let loadError: string | null = null;

  try {
    const supabase = createAdminClient();

    const [tablesResult, credentialsResult] = await Promise.all([
      supabase.from("credential_tables").select("*").order("last_viewed_at", {
        ascending: false,
        nullsFirst: false,
      }),
      supabase
        .from("client_credentials")
        .select("id, table_id")
        .order("client_name", { ascending: true }),
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
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "שגיאה בטעינת פרטי ההתחברות";
  }

  return (
    <AppShell
      wide
      hideHeader
      title="פרטי התחברות"
      description="ניהול טבלאות ופרטי גישה ללקוחות"
    >
      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">לא ניתן לטעון נתונים</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
              טוען טבלאות...
            </div>
          }
        >
          <CredentialsTablesHome
            initialTables={tables}
            initialCredentials={credentials}
          />
        </Suspense>
      )}
    </AppShell>
  );
}
