import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { AppShell } from "@/components/layout/app-shell";
import { getUserDisplayName } from "@/lib/auth/user-names";
import { computeDashboardStats } from "@/lib/dashboard/stats";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  ClientCredential,
  CredentialTable,
  Customer,
  CustomerCharge,
  CustomerPayment,
  RecurringClient,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const userName = getUserDisplayName(user?.email) ?? undefined;

  let customers: Customer[] = [];
  let payments: CustomerPayment[] = [];
  let charges: CustomerCharge[] = [];
  let credentials: Pick<ClientCredential, "id">[] = [];
  let tables: Pick<CredentialTable, "id">[] = [];
  let recurringClients: RecurringClient[] = [];
  let loadError: string | null = null;

  try {
    const supabase = createAdminClient();

    const [
      customersResult,
      paymentsResult,
      chargesResult,
      credentialsResult,
      tablesResult,
      recurringResult,
    ] = await Promise.all([
      supabase.from("credential_clients").select("*"),
      supabase.from("customer_payments").select("*"),
      supabase.from("customer_charges").select("*"),
      supabase.from("client_credentials").select("id"),
      supabase.from("credential_tables").select("id"),
      supabase.from("recurring_clients").select("*"),
    ]);

    if (customersResult.error) {
      loadError = customersResult.error.message;
    } else {
      customers = customersResult.data ?? [];
    }

    payments = paymentsResult.data ?? [];
    charges = chargesResult.data ?? [];
    credentials = credentialsResult.data ?? [];
    tables = tablesResult.data ?? [];
    recurringClients = recurringResult.data ?? [];
  } catch (error) {
    loadError = error instanceof Error ? error.message : "שגיאה בטעינת הדשבורד";
  }

  const stats = computeDashboardStats(
    customers,
    payments,
    charges,
    credentials,
    tables,
    recurringClients,
  );

  return (
    <AppShell>
      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">לא ניתן לטעון נתונים</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : (
        <MainDashboard stats={stats} userName={userName} />
      )}
    </AppShell>
  );
}
