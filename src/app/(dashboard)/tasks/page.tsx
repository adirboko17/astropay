import { TasksManager } from "@/components/tasks/tasks-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Customer,
  CustomerCharge,
  CustomerPayment,
  Task,
  TaskSubtask,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  let tasks: Task[] = [];
  let subtasks: TaskSubtask[] = [];
  let customers: Customer[] = [];
  let payments: CustomerPayment[] = [];
  let charges: CustomerCharge[] = [];
  let loadError: string | null = null;

  try {
    const supabase = createAdminClient();

    const [tasksResult, subtasksResult, customersResult, paymentsResult, chargesResult] =
      await Promise.all([
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase
          .from("task_subtasks")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase.from("credential_clients").select("*"),
        supabase.from("customer_payments").select("*"),
        supabase.from("customer_charges").select("*"),
      ]);

    if (tasksResult.error) {
      loadError = tasksResult.error.message;
    } else {
      tasks = tasksResult.data ?? [];
    }

    subtasks = subtasksResult.data ?? [];
    customers = customersResult.data ?? [];
    payments = paymentsResult.data ?? [];
    charges = chargesResult.data ?? [];
  } catch (error) {
    loadError = error instanceof Error ? error.message : "שגיאה בטעינת המשימות";
  }

  return (
    <>
      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">לא ניתן לטעון נתונים</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : (
        <TasksManager
          initialTasks={tasks}
          initialSubtasks={subtasks}
          customers={customers}
          payments={payments}
          charges={charges}
        />
      )}
    </>
  );
}
