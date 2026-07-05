import { DashboardOpenTasks } from "@/components/dashboard/dashboard-open-tasks";
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { AppShell } from "@/components/layout/app-shell";
import { getUserAssignee, getUserDisplayName } from "@/lib/auth/user-names";
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
  Task,
  TaskSubtask,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const userName = getUserDisplayName(user?.email) ?? undefined;
  const assignee = getUserAssignee(user?.email);

  let customers: Customer[] = [];
  let payments: CustomerPayment[] = [];
  let charges: CustomerCharge[] = [];
  let credentials: Pick<ClientCredential, "id">[] = [];
  let tables: Pick<CredentialTable, "id">[] = [];
  let recurringClients: RecurringClient[] = [];
  let tasks: Task[] = [];
  let subtasks: TaskSubtask[] = [];
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
      tasksResult,
      subtasksResult,
    ] = await Promise.all([
      supabase.from("credential_clients").select("*"),
      supabase.from("customer_payments").select("*"),
      supabase.from("customer_charges").select("*"),
      supabase.from("client_credentials").select("id"),
      supabase.from("credential_tables").select("id"),
      supabase.from("recurring_clients").select("*"),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("task_subtasks").select("*"),
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
    tasks = tasksResult.data ?? [];
    subtasks = subtasksResult.data ?? [];
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
        <MainDashboard
          stats={stats}
          userName={userName}
          openTasksSection={
            assignee ? (
              <DashboardOpenTasks
                assignee={assignee}
                initialTasks={tasks}
                initialSubtasks={subtasks}
                customers={customers}
                payments={payments}
                charges={charges}
              />
            ) : null
          }
        />
      )}
    </AppShell>
  );
}
