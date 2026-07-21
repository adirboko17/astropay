"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  setSubtaskStatus,
  setTaskStatus,
  updateSubtask,
  updateTask,
  type TaskFormData,
} from "@/app/tasks/actions";
import { TaskFormModal, TASK_ASSIGNEES } from "@/components/tasks/task-form-modal";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { isBillingCustomer } from "@/lib/customers/billing";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import type {
  Customer,
  CustomerCharge,
  CustomerPayment,
  Task,
  TaskSubtask,
} from "@/types/database";

interface TasksManagerProps {
  initialTasks: Task[];
  initialSubtasks: TaskSubtask[];
  customers: Customer[];
  payments: CustomerPayment[];
  charges: CustomerCharge[];
  currentAssignee: string | null;
}

const EMPTY_TASK: TaskFormData = {
  title: "",
  description: "",
  category: "customer",
  customer_id: "",
  context_label: "",
  assignee: "",
  due_date: "",
};

type AssigneeFilter = "all" | (typeof TASK_ASSIGNEES)[number];
type DisplayStatusFilter = "all" | "done" | "in_progress" | "not_started" | "overdue";

type DisplayStatus = "done" | "in_progress" | "not_started";
type DerivedPriority = "high" | "medium" | "low";

function matchesAssignee(
  task: Task,
  taskSubtasks: TaskSubtask[],
  assignee: AssigneeFilter,
) {
  if (assignee === "all") return true;
  return (
    task.assignee === assignee ||
    taskSubtasks.some((subtask) => subtask.assignee === assignee)
  );
}

const DISPLAY_STATUS_LABEL: Record<DisplayStatus, string> = {
  done: "הושלם",
  in_progress: "בתהליך",
  not_started: "טרם החל",
};

const DISPLAY_STATUS_CLASS: Record<DisplayStatus, string> = {
  done: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  in_progress: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
  not_started: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

const PRIORITY_LABEL: Record<DerivedPriority, string> = {
  high: "גבוהה",
  medium: "בינונית",
  low: "נמוכה",
};

const PRIORITY_CLASS: Record<DerivedPriority, string> = {
  high: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  medium: "bg-orange-50 text-orange-800 ring-1 ring-orange-100",
  low: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
};

function parseDueDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDueDate(value: string | null) {
  const date = parseDueDate(value);
  if (!date) return null;
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" });
}

function isTaskOverdue(task: Task) {
  if (task.status === "done") return false;
  const due = parseDueDate(task.due_date);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function getTaskProgress(task: Task, taskSubtasks: TaskSubtask[]) {
  if (task.status === "done") return 100;
  if (taskSubtasks.length === 0) return 0;
  const done = taskSubtasks.filter((subtask) => subtask.status === "done").length;
  return Math.round((done / taskSubtasks.length) * 100);
}

function getDisplayStatus(task: Task, taskSubtasks: TaskSubtask[]): DisplayStatus {
  if (task.status === "done") return "done";
  const progress = getTaskProgress(task, taskSubtasks);
  if (progress === 0) return "not_started";
  return "in_progress";
}

function getDerivedPriority(task: Task): DerivedPriority {
  if (isTaskOverdue(task)) return "high";
  const due = parseDueDate(task.due_date);
  if (!due) return "low";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = (due.getTime() - today.getTime()) / 86_400_000;
  if (daysUntil <= 3) return "medium";
  return "low";
}

function progressBarColor(displayStatus: DisplayStatus, progress: number) {
  if (displayStatus === "done") return "bg-emerald-500";
  if (progress === 0) return "bg-slate-300";
  if (displayStatus === "in_progress") return "bg-amber-500";
  return "bg-blue-500";
}

function taskSubtitle(task: Task, customer: Customer | null | undefined) {
  if (customer) return customer.name;
  if (task.context_label) return task.context_label;
  if (task.description) {
    const trimmed = task.description.trim();
    if (trimmed.length <= 80) return trimmed;
    return `${trimmed.slice(0, 77)}…`;
  }
  const labels: Record<string, string> = {
    customer: "משימת לקוח",
    project: "משימת פרויקט",
    other: "משימה כללית",
  };
  return labels[task.category] ?? "";
}

export function TasksManager({
  initialTasks,
  initialSubtasks,
  customers,
  payments,
  charges,
  currentAssignee,
}: TasksManagerProps) {
  const router = useRouter();
  const [tasks, setTasks] = useSyncedState(initialTasks);
  const [subtasks, setSubtasks] = useSyncedState(initialSubtasks);

  const [displayStatusFilter, setDisplayStatusFilter] = useState<DisplayStatusFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>(() =>
    TASK_ASSIGNEES.includes(currentAssignee as (typeof TASK_ASSIGNEES)[number])
      ? (currentAssignee as (typeof TASK_ASSIGNEES)[number])
      : "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<TaskFormData>(EMPTY_TASK);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [subtaskEditDraft, setSubtaskEditDraft] = useState({ title: "", assignee: "" });

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

  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let delayed = 0;

    for (const task of tasks) {
      const taskSubtasks = subtasksByTask.get(task.id) ?? [];
      if (!matchesAssignee(task, taskSubtasks, assigneeFilter)) continue;

      total += 1;
      const display = getDisplayStatus(task, taskSubtasks);
      if (display === "done") completed += 1;
      else if (display === "in_progress") inProgress += 1;
      if (isTaskOverdue(task)) delayed += 1;
    }

    return {
      total,
      completed,
      inProgress,
      delayed,
    };
  }, [tasks, subtasksByTask, assigneeFilter]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("he");

    return tasks.filter((task) => {
      const taskSubtasks = subtasksByTask.get(task.id) ?? [];
      const display = getDisplayStatus(task, taskSubtasks);
      if (displayStatusFilter === "done" && display !== "done") return false;
      if (displayStatusFilter === "in_progress" && display !== "in_progress") return false;
      if (displayStatusFilter === "not_started" && display !== "not_started") return false;
      if (displayStatusFilter === "overdue" && !isTaskOverdue(task)) return false;

      if (!matchesAssignee(task, taskSubtasks, assigneeFilter)) return false;

      if (query) {
        const customerName = task.customer_id
          ? (customerById.get(task.customer_id)?.name ?? "")
          : "";
        const subtaskTitles = taskSubtasks.map((subtask) => subtask.title).join(" ");
        const searchableText =
          `${customerName} ${task.title} ${task.description ?? ""} ${task.context_label ?? ""} ${subtaskTitles}`.toLocaleLowerCase(
            "he",
          );
        if (!searchableText.includes(query)) return false;
      }

      return true;
    });
  }, [
    tasks,
    displayStatusFilter,
    assigneeFilter,
    searchQuery,
    customerById,
    subtasksByTask,
  ]);

  function markBusy(id: string, busy: boolean) {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleExpanded(taskId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function openCreate() {
    setDraft(EMPTY_TASK);
    setCreateOpen(true);
    setError(null);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setDraft({
      title: task.title,
      description: task.description ?? "",
      category: (task.category as TaskFormData["category"]) || "other",
      customer_id: task.customer_id ?? "",
      context_label: task.context_label ?? "",
      assignee: task.assignee ?? "",
      due_date: task.due_date ?? "",
    });
    setError(null);
  }

  async function handleSaveTask() {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);

    try {
      const result = editingTask ? await updateTask(editingTask.id, draft) : await createTask(draft);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (editingTask) {
        setTasks((current) =>
          current.map((task) =>
            task.id === editingTask.id
              ? {
                  ...task,
                  title: draft.title.trim(),
                  description: draft.description.trim() || null,
                  category: draft.category,
                  customer_id: draft.category === "other" ? null : draft.customer_id || null,
                  context_label:
                    draft.category === "other" ? draft.context_label.trim() || null : null,
                  assignee: draft.assignee || null,
                  due_date: draft.due_date || null,
                }
              : task,
          ),
        );
      } else if ("task" in result && result.task) {
        const created = result.task as Task;
        setTasks((current) => [created, ...current]);
      }

      setCreateOpen(false);
      setEditingTask(null);
      router.refresh();
    } catch {
      setError("שגיאה בלתי צפויה בשמירת המשימה");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleTask(task: Task) {
    markBusy(task.id, true);
    const nextStatus = task.status === "done" ? "open" : "done";
    const result = await setTaskStatus(task.id, nextStatus);
    if (result.error) setError(result.error);
    else {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: nextStatus,
                completed_at: nextStatus === "done" ? new Date().toISOString() : null,
              }
            : item,
        ),
      );
    }
    markBusy(task.id, false);
    router.refresh();
  }

  async function handleDeleteTask(task: Task) {
    if (!window.confirm(`למחוק את המשימה "${task.title}"? כל תתי-המשימות יימחקו גם.`)) return;
    markBusy(task.id, true);
    const result = await deleteTask(task.id);
    if (result.error) setError(result.error);
    else {
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setSubtasks((current) => current.filter((item) => item.task_id !== task.id));
    }
    markBusy(task.id, false);
    router.refresh();
  }

  async function handleAddSubtask(taskId: string) {
    const title = (newSubtaskTitles[taskId] ?? "").trim();
    if (!title) return;

    markBusy(taskId, true);
    const result = await createSubtask(taskId, title, "");
    if (result.error) {
      setError(result.error);
    } else {
      setNewSubtaskTitles((current) => ({ ...current, [taskId]: "" }));
      if ("subtask" in result && result.subtask) {
        setSubtasks((current) => [...current, result.subtask]);
      }
      setExpandedIds((current) => new Set(current).add(taskId));
    }
    markBusy(taskId, false);
    router.refresh();
  }

  async function handleToggleSubtask(subtask: TaskSubtask) {
    markBusy(subtask.id, true);
    const nextStatus = subtask.status === "done" ? "open" : "done";
    const result = await setSubtaskStatus(subtask.id, nextStatus);
    if (result.error) setError(result.error);
    else {
      setSubtasks((current) =>
        current.map((item) =>
          item.id === subtask.id
            ? {
                ...item,
                status: nextStatus,
                completed_at: nextStatus === "done" ? new Date().toISOString() : null,
              }
            : item,
        ),
      );
    }
    markBusy(subtask.id, false);
    router.refresh();
  }

  async function handleSaveSubtaskEdit(subtask: TaskSubtask) {
    markBusy(subtask.id, true);
    const result = await updateSubtask(subtask.id, subtaskEditDraft);
    if (result.error) {
      setError(result.error);
    } else {
      setSubtasks((current) =>
        current.map((item) =>
          item.id === subtask.id
            ? {
                ...item,
                title: subtaskEditDraft.title.trim(),
                assignee: subtaskEditDraft.assignee || null,
              }
            : item,
        ),
      );
      setEditingSubtaskId(null);
    }
    markBusy(subtask.id, false);
    router.refresh();
  }

  async function handleDeleteSubtask(subtask: TaskSubtask) {
    markBusy(subtask.id, true);
    const result = await deleteSubtask(subtask.id);
    if (result.error) setError(result.error);
    else setSubtasks((current) => current.filter((item) => item.id !== subtask.id));
    markBusy(subtask.id, false);
    router.refresh();
  }

  return (
    <div className="space-y-5 pb-8">
      {error ? (
        <div className="rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="סה״כ משימות"
          value={stats.total}
          tone="blue"
          progress={stats.total ? 100 : 0}
          icon={<ClipboardIcon className="text-[#4c5cff]" />}
        />
        <StatCard
          label="באיחור"
          value={stats.delayed}
          tone="rose"
          progress={stats.total ? (stats.delayed / stats.total) * 100 : 0}
          icon={<AlertIcon className="text-[#ff334e]" />}
        />
        <StatCard
          label="בתהליך"
          value={stats.inProgress}
          tone="amber"
          progress={stats.total ? (stats.inProgress / stats.total) * 100 : 0}
          icon={<ClockIcon className="text-[#ff9700]" />}
        />
        <StatCard
          label="הושלמו"
          value={stats.completed}
          tone="emerald"
          progress={stats.total ? (stats.completed / stats.total) * 100 : 0}
          icon={<CheckCircleIcon className="text-[#22b86a]" />}
        />
      </div>

      <section className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="relative z-20 border-b border-slate-100 p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] flex-[1.35]">
                <SearchIcon />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="חיפוש לפי לקוח, משימה או תת־משימה..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pe-10 ps-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="נקה חיפוש"
                    className="absolute end-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  >
                    <ClearIcon />
                  </button>
                ) : null}
              </div>

              <AssigneeDropdown
                value={assigneeFilter}
                currentAssignee={currentAssignee}
                onChange={setAssigneeFilter}
              />
              <StatusDropdown value={displayStatusFilter} onChange={setDisplayStatusFilter} />
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#3f5bf6] px-5 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(63,91,246,0.22)] transition hover:bg-[#304be8]"
            >
              <PlusIcon />
              משימה חדשה
            </button>
          </div>
        </div>

        <div className="overflow-x-auto p-2">
          <div className="min-w-[930px]">
          <div className="grid grid-cols-[minmax(300px,1fr)_132px_112px_112px_170px_44px] items-center px-4 py-2.5 text-[11px] font-semibold text-slate-500">
            <span>משימה</span>
            <span>תאריך יעד</span>
            <span>סטטוס</span>
            <span>עדיפות</span>
            <span>התקדמות</span>
            <span className="flex justify-center">
              <PlusIcon className="text-slate-500" />
            </span>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-white px-4 py-16 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      {tasks.length === 0 ? "עדיין אין משימות" : "לא נמצאו משימות מתאימות לסינון"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {tasks.length === 0
                        ? "לחץ על ״משימה חדשה״ כדי להתחיל"
                        : "נסה לשנות את החיפוש או את אחד הסינונים"}
                    </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => {
                  const taskSubtasks = subtasksByTask.get(task.id) ?? [];
                  const customer = task.customer_id ? customerById.get(task.customer_id) : null;
                  const busy = busyIds.has(task.id);
                  const expanded = expandedIds.has(task.id);
                  const progress = getTaskProgress(task, taskSubtasks);
                  const displayStatus = getDisplayStatus(task, taskSubtasks);
                  const priority = getDerivedPriority(task);
                  const dueLabel = formatDueDate(task.due_date);
                  const overdue = isTaskOverdue(task);
                  const subtitle = taskSubtitle(task, customer);

                  return (
                    <TaskTableGroup
                      key={task.id}
                      task={task}
                      taskSubtasks={taskSubtasks}
                      customer={customer}
                      busy={busy}
                      expanded={expanded}
                      progress={progress}
                      displayStatus={displayStatus}
                      priority={priority}
                      dueLabel={dueLabel}
                      overdue={overdue}
                      subtitle={subtitle}
                      newSubtaskTitle={newSubtaskTitles[task.id] ?? ""}
                      editingSubtaskId={editingSubtaskId}
                      subtaskEditDraft={subtaskEditDraft}
                      busyIds={busyIds}
                      onToggleExpand={() => toggleExpanded(task.id)}
                      onEdit={() => openEdit(task)}
                      onDelete={() => handleDeleteTask(task)}
                      onToggleTask={() => handleToggleTask(task)}
                      onNewSubtaskTitleChange={(value) =>
                        setNewSubtaskTitles((current) => ({ ...current, [task.id]: value }))
                      }
                      onAddSubtask={() => handleAddSubtask(task.id)}
                      onToggleSubtask={handleToggleSubtask}
                      onStartEditSubtask={(subtask) => {
                        setEditingSubtaskId(subtask.id);
                        setSubtaskEditDraft({
                          title: subtask.title,
                          assignee: subtask.assignee ?? "",
                        });
                      }}
                      onSubtaskDraftChange={setSubtaskEditDraft}
                      onSaveSubtaskEdit={handleSaveSubtaskEdit}
                      onCancelSubtaskEdit={() => setEditingSubtaskId(null)}
                      onDeleteSubtask={handleDeleteSubtask}
                    />
                  );
              })}
            </div>
          )}
          </div>
        </div>
      </section>

      {createOpen || editingTask ? (
        <TaskFormModal
          mode={editingTask ? "edit" : "create"}
          draft={draft}
          billingCustomers={billingCustomers}
          projectCustomers={projectCustomers}
          isSaving={isSaving}
          onChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))}
          onClose={() => {
            if (isSaving) return;
            setCreateOpen(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  progress,
  icon,
}: {
  label: string;
  value: number;
  tone: "blue" | "rose" | "amber" | "emerald";
  progress: number;
  icon: React.ReactNode;
}) {
  const tones = {
    blue: {
      number: "text-[#4c5cff]",
      icon: "bg-white text-[#4c5cff] ring-[#dfe2ff]",
      track: "bg-[#dfe3ff]",
      bar: "from-[#6875ff] to-[#4254f5]",
      card: "border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/90",
      glow: "bg-indigo-300/25",
      caption: "כל המשימות",
    },
    rose: {
      number: "text-[#ff334e]",
      icon: "bg-white text-[#ff334e] ring-[#ffdce2]",
      track: "bg-[#ffd8df]",
      bar: "from-[#ff6579] to-[#f7254b]",
      card: "border-rose-100 bg-gradient-to-br from-white via-white to-rose-50/90",
      glow: "bg-rose-300/25",
      caption: "דורשות טיפול",
    },
    amber: {
      number: "text-[#ff9700]",
      icon: "bg-white text-[#ff9700] ring-[#ffe7c2]",
      track: "bg-[#ffecd0]",
      bar: "from-[#ffb23f] to-[#f28b00]",
      card: "border-amber-100 bg-gradient-to-br from-white via-white to-amber-50/90",
      glow: "bg-amber-300/25",
      caption: "נמצאות בעבודה",
    },
    emerald: {
      number: "text-[#22b86a]",
      icon: "bg-white text-[#22b86a] ring-[#d5f3e2]",
      track: "bg-[#cef0dd]",
      bar: "from-[#43ca82] to-[#16a960]",
      card: "border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/90",
      glow: "bg-emerald-300/25",
      caption: "הסתיימו בהצלחה",
    },
  }[tone];
  const roundedProgress = Math.round(Math.max(0, Math.min(progress, 100)));

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 shadow-[0_8px_24px_rgba(15,23,42,0.055)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)] ${tones.card}`}
    >
      <span
        className={`pointer-events-none absolute -end-8 -top-10 h-28 w-28 rounded-full blur-2xl ${tones.glow}`}
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ${tones.icon}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-0.5 flex items-end gap-2">
            <p className={`text-[30px] font-bold leading-none tabular-nums ${tones.number}`}>{value}</p>
            <span className="mb-0.5 truncate text-[10px] font-medium text-slate-400">
              {tones.caption}
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium text-slate-400">
          <span>מתוך המשימות</span>
          <span className="tabular-nums">{roundedProgress}%</span>
        </div>
        <div className={`h-1.5 overflow-hidden rounded-full ${tones.track}`}>
          <div
            className={`h-full rounded-full bg-gradient-to-l transition-all duration-500 ${tones.bar}`}
            style={{ width: `${roundedProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface TaskTableGroupProps {
  task: Task;
  taskSubtasks: TaskSubtask[];
  customer: Customer | null | undefined;
  busy: boolean;
  expanded: boolean;
  progress: number;
  displayStatus: DisplayStatus;
  priority: DerivedPriority;
  dueLabel: string | null;
  overdue: boolean;
  subtitle: string;
  newSubtaskTitle: string;
  editingSubtaskId: string | null;
  subtaskEditDraft: { title: string; assignee: string };
  busyIds: Set<string>;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleTask: () => void;
  onNewSubtaskTitleChange: (value: string) => void;
  onAddSubtask: () => void;
  onToggleSubtask: (subtask: TaskSubtask) => void;
  onStartEditSubtask: (subtask: TaskSubtask) => void;
  onSubtaskDraftChange: (draft: { title: string; assignee: string }) => void;
  onSaveSubtaskEdit: (subtask: TaskSubtask) => void;
  onCancelSubtaskEdit: () => void;
  onDeleteSubtask: (subtask: TaskSubtask) => void;
}

function TaskTableGroup({
  task,
  taskSubtasks,
  customer,
  busy,
  expanded,
  progress,
  displayStatus,
  priority,
  dueLabel,
  overdue,
  subtitle,
  newSubtaskTitle,
  editingSubtaskId,
  subtaskEditDraft,
  busyIds,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleTask,
  onNewSubtaskTitleChange,
  onAddSubtask,
  onToggleSubtask,
  onStartEditSubtask,
  onSubtaskDraftChange,
  onSaveSubtaskEdit,
  onCancelSubtaskEdit,
  onDeleteSubtask,
}: TaskTableGroupProps) {
  const barColor = progressBarColor(displayStatus, progress);
  const isDone = task.status === "done";
  const heading = customer?.name ?? task.context_label ?? task.title;
  const subheading = customer || task.context_label ? task.title : subtitle;

  function handleRowClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, [role='menu']")) return;
    onToggleExpand();
  }

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-white shadow-[0_3px_12px_rgba(15,23,42,0.045)] transition ${
        expanded ? "border-slate-200" : "border-slate-100 hover:border-slate-200"
      }`}
    >
      <div
        onClick={handleRowClick}
        className="grid min-h-[62px] cursor-pointer grid-cols-[minmax(300px,1fr)_132px_112px_112px_170px_44px] items-center"
      >
        <div className="flex min-w-0 items-center gap-3 px-4 py-3">
          <CategoryIcon category={task.category} />
          <div className="min-w-0 flex-1">
            {customer ? (
              <Link
                href={`/customers/${customer.id}`}
                className="block truncate text-sm font-bold text-slate-900 transition hover:text-blue-700"
              >
                {heading}
              </Link>
            ) : (
              <p className="truncate text-sm font-bold text-slate-900">{heading}</p>
            )}
            {subheading ? <p className="mt-1 truncate text-xs text-slate-500">{subheading}</p> : null}
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
              expanded
                ? "bg-indigo-50 text-indigo-600"
                : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
            aria-expanded={expanded}
            aria-label={expanded ? "כווץ תתי משימות" : "הרחב תתי משימות"}
          >
            <ChevronIcon expanded={expanded} />
          </button>
        </div>

        <div className="px-3 py-3">
          {dueLabel ? (
            <div>
              <p className={`text-sm tabular-nums ${overdue ? "font-semibold text-rose-600" : "text-slate-700"}`}>
                {dueLabel}
              </p>
              {overdue ? <p className="text-[11px] font-medium text-rose-500">באיחור</p> : null}
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>

        <div className="px-3 py-3">
          <span
            className={`inline-flex min-w-[70px] justify-center rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${DISPLAY_STATUS_CLASS[displayStatus]}`}
          >
            {DISPLAY_STATUS_LABEL[displayStatus]}
          </span>
        </div>

        <div className="px-3 py-3">
          <span
            className={`inline-flex min-w-[66px] justify-center rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${PRIORITY_CLASS[priority]}`}
          >
            {PRIORITY_LABEL[priority]}
          </span>
        </div>

        <div className="px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-xs font-semibold tabular-nums text-slate-600">
              {progress}%
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center px-1 py-3">
          <TableRowActionsMenu
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={busy}
            extraItems={[
              {
                label: isDone ? "פתח מחדש" : "סמן כהושלם",
                onClick: onToggleTask,
                disabled: busy,
              },
            ]}
          />
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 pb-4 pt-3">
            <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-xs font-semibold text-slate-500">
                  תתי משימות ({taskSubtasks.length})
                </p>
              </div>

              {taskSubtasks.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold text-slate-400">
                      <th className="px-4 py-2 text-start">משימה</th>
                      <th className="w-28 px-3 py-2 text-start">סטטוס</th>
                      <th className="w-28 px-3 py-2 text-start">עדיפות</th>
                      <th className="w-32 px-3 py-2 text-start">תאריך יעד</th>
                      <th className="w-20 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {taskSubtasks.map((subtask) => {
                      const subtaskDone = subtask.status === "done";
                      const subtaskBusy = busyIds.has(subtask.id);
                      const isEditing = editingSubtaskId === subtask.id;
                      const subDisplay: DisplayStatus = subtaskDone ? "done" : "in_progress";
                      const subPriority = getDerivedPriority(task);

                      return (
                        <tr key={subtask.id} className="border-t border-slate-50">
                          <td className="px-4 py-2.5">
                            {isEditing ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={subtaskEditDraft.title}
                                  disabled={subtaskBusy}
                                  onChange={(event) =>
                                    onSubtaskDraftChange({
                                      ...subtaskEditDraft,
                                      title: event.target.value,
                                    })
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") onSaveSubtaskEdit(subtask);
                                    if (event.key === "Escape") onCancelSubtaskEdit();
                                  }}
                                  autoFocus
                                  className="h-9 min-w-48 flex-1 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-blue-300"
                                />
                                <select
                                  value={subtaskEditDraft.assignee}
                                  disabled={subtaskBusy}
                                  onChange={(event) =>
                                    onSubtaskDraftChange({
                                      ...subtaskEditDraft,
                                      assignee: event.target.value,
                                    })
                                  }
                                  className="h-9 rounded-lg border border-slate-200 px-2 text-xs outline-none"
                                >
                                  <option value="">ללא אחראי</option>
                                  {TASK_ASSIGNEES.map((name) => (
                                    <option key={name} value={name}>
                                      {name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={subtaskBusy || !subtaskEditDraft.title.trim()}
                                  onClick={() => onSaveSubtaskEdit(subtask)}
                                  className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  שמור
                                </button>
                                <button
                                  type="button"
                                  onClick={onCancelSubtaskEdit}
                                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500"
                                >
                                  ביטול
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={subtaskBusy}
                                  onClick={() => onToggleSubtask(subtask)}
                                  aria-label={subtaskDone ? "פתח מחדש" : "סמן כהושלם"}
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                    subtaskDone
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-slate-300 bg-white hover:border-emerald-400"
                                  } disabled:opacity-50`}
                                >
                                  {subtaskDone ? <CheckIcon /> : null}
                                </button>
                                <span
                                  className={`text-sm ${subtaskDone ? "text-slate-400 line-through" : "text-slate-800"}`}
                                >
                                  {subtask.title}
                                </span>
                                {subtask.assignee ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                    {subtask.assignee}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${DISPLAY_STATUS_CLASS[subDisplay]}`}
                            >
                              {DISPLAY_STATUS_LABEL[subDisplay]}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_CLASS[subPriority]}`}
                            >
                              {PRIORITY_LABEL[subPriority]}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {dueLabel ? (
                              <span className={`text-xs tabular-nums ${overdue ? "text-rose-600" : "text-slate-600"}`}>
                                {dueLabel}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {!isEditing ? (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  disabled={subtaskBusy}
                                  onClick={() => onStartEditSubtask(subtask)}
                                  className="rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100"
                                >
                                  ערוך
                                </button>
                                <button
                                  type="button"
                                  disabled={subtaskBusy}
                                  onClick={() => onDeleteSubtask(subtask)}
                                  className="rounded-md px-2 py-1 text-[11px] text-rose-500 hover:bg-rose-50"
                                >
                                  מחק
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-slate-400">אין תתי משימות עדיין</p>
              )}

              <div className="border-t border-slate-100 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    disabled={busy}
                    placeholder="כותרת תת משימה..."
                    onChange={(event) => onNewSubtaskTitleChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onAddSubtask();
                    }}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
                  />
                  <button
                    type="button"
                    disabled={busy || !newSubtaskTitle.trim()}
                    onClick={onAddSubtask}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-800 disabled:opacity-40"
                  >
                    <span>+</span>
                    הוסף תת משימה
                  </button>
                </div>
              </div>
            </div>
        </div>
      ) : null}
    </article>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const className = "h-9 w-9 shrink-0 rounded-lg p-2";
  if (category === "customer") {
    return (
      <div className={`${className} bg-blue-50 text-blue-600`}>
        <UsersIcon />
      </div>
    );
  }
  if (category === "project") {
    return (
      <div className={`${className} bg-violet-50 text-violet-600`}>
        <ChartIcon />
      </div>
    );
  }
  return (
    <div className={`${className} bg-slate-100 text-slate-600`}>
      <FolderIcon />
    </div>
  );
}

function AssigneeDropdown({
  value,
  currentAssignee,
  onChange,
}: {
  value: AssigneeFilter;
  currentAssignee: string | null;
  onChange: (value: AssigneeFilter) => void;
}) {
  const selectedLabel = value === "all" ? "כל העובדים" : value;

  function selectAssignee(nextValue: AssigneeFilter, element: HTMLButtonElement) {
    onChange(nextValue);
    element.closest("details")?.removeAttribute("open");
  }

  return (
    <details name="task-filter" className="group relative min-w-[230px] flex-1">
      <summary className="flex h-12 cursor-pointer list-none items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 [&::-webkit-details-marker]:hidden">
        <AssigneeAvatar name={value} />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium text-slate-400">הצג משימות של</span>
          <span className="block truncate text-sm font-semibold text-slate-800">{selectedLabel}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-slate-400 transition group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m8 10 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="absolute inset-x-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
        <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          בחירת עובד
        </p>
        {(["all", ...TASK_ASSIGNEES] as AssigneeFilter[]).map((assignee) => {
          const isSelected = assignee === value;
          const isCurrent = assignee !== "all" && assignee === currentAssignee;

          return (
            <button
              key={assignee}
              type="button"
              onClick={(event) => selectAssignee(assignee, event.currentTarget)}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-start transition ${
                isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
              }`}
            >
              <AssigneeAvatar name={assignee} />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>
                  {assignee === "all" ? "כל העובדים" : assignee}
                </span>
                <span className="block text-[11px] text-slate-400">
                  {assignee === "all"
                    ? "הצגת כל המשימות"
                    : isCurrent
                      ? "המשתמש המחובר"
                      : "עובד צוות"}
                </span>
              </span>
              {isCurrent ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  אני
                </span>
              ) : null}
              {isSelected ? <CheckIcon /> : null}
            </button>
          );
        })}
      </div>
    </details>
  );
}

function AssigneeAvatar({ name }: { name: AssigneeFilter }) {
  if (name === "all") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 p-2 text-slate-500 ring-2 ring-white">
        <UsersIcon />
      </span>
    );
  }

  const tone =
    name === "אדיר"
      ? "from-indigo-500 to-blue-600 shadow-indigo-200"
      : "from-fuchsia-500 to-violet-600 shadow-violet-200";

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white shadow-md ring-2 ring-white ${tone}`}
    >
      {getInitials(name)}
    </span>
  );
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length > 1) return `${words[0][0]}${words[words.length - 1][0]}`;
  return name.slice(0, 2);
}

const STATUS_FILTER_OPTIONS: {
  value: DisplayStatusFilter;
  label: string;
  description: string;
  tone: string;
  icon: "all" | "progress" | "pending" | "done" | "overdue";
}[] = [
  {
    value: "all",
    label: "כל הסטטוסים",
    description: "הצגת כל המשימות",
    tone: "bg-indigo-50 text-indigo-600",
    icon: "all",
  },
  {
    value: "in_progress",
    label: "בתהליך",
    description: "משימות שהעבודה עליהן החלה",
    tone: "bg-amber-50 text-amber-600",
    icon: "progress",
  },
  {
    value: "not_started",
    label: "טרם החל",
    description: "משימות שממתינות להתחלה",
    tone: "bg-slate-100 text-slate-500",
    icon: "pending",
  },
  {
    value: "done",
    label: "הושלם",
    description: "משימות שהסתיימו",
    tone: "bg-emerald-50 text-emerald-600",
    icon: "done",
  },
  {
    value: "overdue",
    label: "באיחור",
    description: "משימות שעבר להן תאריך היעד",
    tone: "bg-rose-50 text-rose-600",
    icon: "overdue",
  },
];

function StatusDropdown({
  value,
  onChange,
}: {
  value: DisplayStatusFilter;
  onChange: (value: DisplayStatusFilter) => void;
}) {
  const selected = STATUS_FILTER_OPTIONS.find((option) => option.value === value) ?? STATUS_FILTER_OPTIONS[0];

  function selectStatus(nextValue: DisplayStatusFilter, element: HTMLButtonElement) {
    onChange(nextValue);
    element.closest("details")?.removeAttribute("open");
  }

  return (
    <details name="task-filter" className="group relative min-w-[210px] flex-1">
      <summary className="flex h-12 cursor-pointer list-none items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 [&::-webkit-details-marker]:hidden">
        <StatusFilterIcon option={selected} />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium text-slate-400">סינון לפי סטטוס</span>
          <span className="block truncate text-sm font-semibold text-slate-800">{selected.label}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-slate-400 transition group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m8 10 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="absolute inset-x-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
        <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          בחירת סטטוס
        </p>
        {STATUS_FILTER_OPTIONS.map((option) => {
          const isSelected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={(event) => selectStatus(option.value, event.currentTarget)}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-start transition ${
                isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
              }`}
            >
              <StatusFilterIcon option={option} />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>
                  {option.label}
                </span>
                <span className="block truncate text-[11px] text-slate-400">{option.description}</span>
              </span>
              {isSelected ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <CheckIcon />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </details>
  );
}

function StatusFilterIcon({ option }: { option: (typeof STATUS_FILTER_OPTIONS)[number] }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-1.5 ${option.tone}`}>
      {option.icon === "all" ? <ClipboardIcon /> : null}
      {option.icon === "progress" ? <ClockIcon /> : null}
      {option.icon === "pending" ? <PendingIcon /> : null}
      {option.icon === "done" ? <CheckCircleIcon /> : null}
      {option.icon === "overdue" ? <AlertIcon /> : null}
    </span>
  );
}

function PendingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M9 12h6" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3v18h18" strokeLinecap="round" />
      <path d="M7 16l4-8 4 5 5-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-5l-2-2H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1Z" />
    </svg>
  );
}
