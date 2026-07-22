"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createTask, setTaskStatus, type TaskFormData } from "@/app/tasks/actions";
import { TaskFormModal } from "@/components/tasks/task-form-modal";
import { isBillingCustomer } from "@/lib/customers/billing";
import type { TaskAssignee } from "@/lib/auth/user-names";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import type {
  Customer,
  CustomerCharge,
  CustomerPayment,
  Task,
  TaskSubtask,
} from "@/types/database";

interface DashboardOpenTasksProps {
  assignee: TaskAssignee;
  initialTasks: Task[];
  initialSubtasks: TaskSubtask[];
  customers: Customer[];
  payments: CustomerPayment[];
  charges: CustomerCharge[];
}

const CATEGORY_LABEL: Record<string, string> = {
  customer: "לקוח",
  project: "פרויקט",
  other: "אחר",
};

const CATEGORY_BADGE: Record<string, string> = {
  customer: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  project: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  other: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

function formatDueDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
}

function taskMatchesAssignee(
  task: Task,
  subtasks: TaskSubtask[],
  assignee: TaskAssignee,
) {
  if (task.assignee === assignee) return true;
  return subtasks.some((subtask) => subtask.assignee === assignee);
}

export function DashboardOpenTasks({
  assignee,
  initialTasks,
  initialSubtasks,
  customers,
  payments,
  charges,
}: DashboardOpenTasksProps) {
  const router = useRouter();
  const [tasks, setTasks] = useSyncedState(initialTasks);
  const [subtasks] = useSyncedState(initialSubtasks);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<TaskFormData>({
    title: "",
    description: "",
    category: "customer",
    customer_id: "",
    context_label: "",
    assignee,
    due_date: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const customer of customers) map.set(customer.id, customer);
    return map;
  }, [customers]);

  const billingCustomers = useMemo(
    () =>
      customers
        .filter((customer) => isBillingCustomer(customer, payments, charges))
        .sort((a, b) => a.name.localeCompare(b.name, "he")),
    [customers, payments, charges],
  );

  const projectCustomers = useMemo(
    () =>
      customers
        .filter((customer) => !isBillingCustomer(customer, payments, charges))
        .sort((a, b) => a.name.localeCompare(b.name, "he")),
    [customers, payments, charges],
  );

  const subtasksByTask = useMemo(() => {
    const map = new Map<string, TaskSubtask[]>();
    for (const subtask of subtasks) {
      const list = map.get(subtask.task_id) ?? [];
      list.push(subtask);
      map.set(subtask.task_id, list);
    }
    return map;
  }, [subtasks]);

  const openTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (task.status !== "open") return false;
        return taskMatchesAssignee(task, subtasksByTask.get(task.id) ?? [], assignee);
      })
      .sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return b.created_at.localeCompare(a.created_at);
      })
      .slice(0, 5);
  }, [tasks, subtasksByTask, assignee]);

  const totalOpenForUser = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status === "open" &&
          taskMatchesAssignee(task, subtasksByTask.get(task.id) ?? [], assignee),
      ).length,
    [tasks, subtasksByTask, assignee],
  );

  function openCreate() {
    setDraft({
      title: "",
      description: "",
      category: "customer",
      customer_id: "",
      context_label: "",
      assignee,
      due_date: "",
    });
    setError(null);
    setCreateOpen(true);
  }

  async function handleSaveTask() {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);

    try {
      const result = await createTask({ ...draft, assignee });
      if (result.error) {
        setError(result.error);
        return;
      }

      if ("task" in result && result.task) {
        setTasks((current) => [result.task as Task, ...current]);
      }

      setCreateOpen(false);
      router.refresh();
    } catch {
      setError("שגיאה בלתי צפויה בשמירת המשימה");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleTask(task: Task) {
    setBusyId(task.id);
    const result = await setTaskStatus(task.id, "done");
    if (result.error) {
      setError(result.error);
    } else {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? { ...item, status: "done", completed_at: new Date().toISOString() }
            : item,
        ),
      );
    }
    setBusyId(null);
    router.refresh();
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 ring-1 ring-violet-200">
              <TasksGlyph />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">המשימות הפתוחות שלי</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {totalOpenForUser} משימות פתוחות · {assignee}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/tasks"
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              כל המשימות
            </Link>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              + משימה חדשה
            </button>
          </div>
        </div>

        {error ? (
          <div className="border-b border-red-100 bg-red-50 px-5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {openTasks.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-slate-600">אין משימות פתוחות כרגע</p>
            <p className="mt-1 text-sm text-slate-400">לחץ על &quot;+ משימה חדשה&quot; כדי להוסיף</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {openTasks.map((task) => {
              const customer = task.customer_id ? customerById.get(task.customer_id) : null;
              const linkedLabel = customer?.name ?? task.context_label;
              const dueLabel = formatDueDate(task.due_date);
              const taskSubtasks = subtasksByTask.get(task.id) ?? [];
              const openSubtasks = taskSubtasks.filter((subtask) => subtask.status === "open").length;
              const busy = busyId === task.id;

              return (
                <li key={task.id} className="px-5 py-3.5 transition hover:bg-violet-50/30">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleToggleTask(task)}
                      aria-label="סמן כהושלם"
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE[task.category] ?? CATEGORY_BADGE.other}`}
                        >
                          {CATEGORY_LABEL[task.category] ?? task.category}
                        </span>
                        {linkedLabel ? (
                          <span className="truncate text-xs font-medium text-slate-600">
                            {linkedLabel}
                          </span>
                        ) : null}
                      </div>

                      <p className="text-sm font-semibold leading-snug text-slate-900">{task.title}</p>

                      {task.description ? (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{task.description}</p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        {dueLabel ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                            <CalendarIcon />
                            {dueLabel}
                          </span>
                        ) : null}
                        {taskSubtasks.length > 0 ? (
                          <span>
                            {openSubtasks}/{taskSubtasks.length} תתי-משימות פתוחות
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <Link
                      href="/tasks"
                      className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-violet-700 transition hover:bg-violet-100"
                    >
                      פרטים
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {totalOpenForUser > 5 ? (
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-center">
            <Link href="/tasks" className="text-xs font-medium text-violet-700 hover:underline">
              + עוד {totalOpenForUser - 5} משימות פתוחות
            </Link>
          </div>
        ) : null}
      </section>

      {createOpen ? (
        <TaskFormModal
          mode="create"
          draft={draft}
          billingCustomers={billingCustomers}
          projectCustomers={projectCustomers}
          isSaving={isSaving}
          onChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))}
          onClose={() => {
            if (isSaving) return;
            setCreateOpen(false);
          }}
          onSave={handleSaveTask}
        />
      ) : null}
    </>
  );
}

function TasksGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 6h11M9 12h11M9 18h11" strokeLinecap="round" />
      <path d="m3.5 5.5 1 1L6.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3.5 11.5 1 1 2-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3.5 17.5 1 1 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 2v3M16 2v3M4 9h16" strokeLinecap="round" />
      <path d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}
