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
import { PageHero } from "@/components/layout/page-hero";
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

type CategoryFilter = "all" | "customer" | "project" | "other";
type StatusFilter = "all" | "open" | "done";
type AssigneeFilter = "all" | (typeof TASK_ASSIGNEES)[number];

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
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" });
}

export function TasksManager({
  initialTasks,
  initialSubtasks,
  customers,
  payments,
  charges,
}: TasksManagerProps) {
  const router = useRouter();
  const [tasks, setTasks] = useSyncedState(initialTasks);
  const [subtasks, setSubtasks] = useSyncedState(initialSubtasks);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      if (categoryFilter !== "all" && task.category !== categoryFilter) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (assigneeFilter !== "all") {
        const taskSubtasks = subtasksByTask.get(task.id) ?? [];
        const matchesAssignee =
          task.assignee === assigneeFilter ||
          taskSubtasks.some((subtask) => subtask.assignee === assigneeFilter);
        if (!matchesAssignee) return false;
      }

      if (query) {
        const customerName = task.customer_id
          ? (customerById.get(task.customer_id)?.name ?? "")
          : "";
        const haystack = `${task.title} ${task.description ?? ""} ${customerName} ${task.context_label ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [tasks, categoryFilter, statusFilter, assigneeFilter, searchQuery, customerById, subtasksByTask]);

  const openCount = tasks.filter((task) => task.status === "open").length;
  const doneCount = tasks.length - openCount;

  function markBusy(id: string, busy: boolean) {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
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
      const result = editingTask
        ? await updateTask(editingTask.id, draft)
        : await createTask(draft);

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

  const categoryTabs: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: "הכל" },
    { key: "customer", label: "לקוחות" },
    { key: "project", label: "פרויקטים" },
    { key: "other", label: "אחר" },
  ];

  const assigneeTabs: { key: AssigneeFilter; label: string }[] = [
    { key: "all", label: "כולם" },
    ...TASK_ASSIGNEES.map((name) => ({ key: name as AssigneeFilter, label: name })),
  ];

  const assigneeCounts = useMemo(() => {
    const counts: Record<AssigneeFilter, number> = { all: tasks.length, אדיר: 0, איתי: 0 };

    for (const task of tasks) {
      const taskSubtasks = subtasksByTask.get(task.id) ?? [];
      const assignees = new Set<string>();

      if (task.assignee) assignees.add(task.assignee);
      for (const subtask of taskSubtasks) {
        if (subtask.assignee) assignees.add(subtask.assignee);
      }

      for (const name of assignees) {
        if (name === "אדיר" || name === "איתי") {
          counts[name as AssigneeFilter] += 1;
        }
      }
    }

    return counts;
  }, [tasks, subtasksByTask]);

  return (
    <div className="space-y-5">
      <PageHero
        title="משימות"
        description="מעקב משימות לפי לקוחות, פרויקטים ונושאים כלליים — עם אחראי לכל משימה"
        accent="violet"
        metrics={[
          { label: "משימות פתוחות", value: String(openCount) },
          { label: "הושלמו", value: String(doneCount) },
          { label: "סה״כ", value: String(tasks.length) },
        ]}
      >
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-800 shadow-sm transition hover:bg-violet-50"
        >
          + משימה חדשה
        </button>
      </PageHero>

      {error ? (
        <div className="rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="space-y-3 border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCategoryFilter(tab.key)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    categoryFilter === tab.key
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="open">פתוחות</option>
                <option value="done">סגורות</option>
                <option value="all">הכל</option>
              </select>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="חיפוש משימה..."
                className="h-10 w-52 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">מטפל:</span>
            {assigneeTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setAssigneeFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  assigneeFilter === tab.key
                    ? tab.key === "אדיר"
                      ? "bg-amber-500 text-white shadow-sm"
                      : tab.key === "איתי"
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    assigneeFilter === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-white text-slate-500"
                  }`}
                >
                  {assigneeCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium text-slate-600">
              {tasks.length === 0 ? "עדיין אין משימות" : "לא נמצאו משימות מתאימות לסינון"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {tasks.length === 0
                ? "לחץ על ״+ משימה חדשה״ כדי להתחיל"
                : "נסה לשנות את הסינון או את החיפוש"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3 p-4">
            {filteredTasks.map((task) => {
              const taskSubtasks = subtasksByTask.get(task.id) ?? [];
              const doneSubtasks = taskSubtasks.filter((subtask) => subtask.status === "done").length;
              const customer = task.customer_id ? customerById.get(task.customer_id) : null;
              const isDone = task.status === "done";
              const busy = busyIds.has(task.id);
              const dueLabel = formatDueDate(task.due_date);
              const linkedLabel = customer?.name ?? task.context_label;

              return (
                <li
                  key={task.id}
                  className={`rounded-2xl border transition ${
                    isDone
                      ? "border-slate-200/80 bg-slate-50/80"
                      : "border-slate-200/80 bg-white shadow-sm hover:border-slate-300 hover:shadow-md"
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleToggleTask(task)}
                        aria-label={isDone ? "פתח מחדש" : "סמן כהושלם"}
                        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          isDone
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 bg-white text-transparent hover:border-emerald-400 hover:bg-emerald-50"
                        } disabled:opacity-50`}
                      >
                        <CheckIcon />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${CATEGORY_BADGE[task.category] ?? CATEGORY_BADGE.other}`}
                              >
                                {CATEGORY_LABEL[task.category] ?? task.category}
                              </span>

                              {linkedLabel ? (
                                customer ? (
                                  <Link
                                    href={`/customers/${customer.id}`}
                                    className="inline-flex max-w-[220px] items-center gap-1 truncate text-sm font-medium text-blue-700 transition hover:text-blue-900 hover:underline"
                                  >
                                    <LinkIcon />
                                    <span className="truncate">{linkedLabel}</span>
                                  </Link>
                                ) : (
                                  <span className="inline-flex max-w-[220px] truncate text-sm font-medium text-slate-700">
                                    {linkedLabel}
                                  </span>
                                )
                              ) : null}
                            </div>

                            <h3
                              className={`text-base font-semibold leading-snug sm:text-[17px] ${
                                isDone ? "text-slate-400 line-through" : "text-slate-900"
                              }`}
                            >
                              {task.title}
                            </h3>

                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {task.assignee ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-100">
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-200 text-[9px] font-bold text-amber-900">
                                      {task.assignee.charAt(0)}
                                    </span>
                                    {task.assignee}
                                  </span>
                                ) : null}
                              </div>

                              {dueLabel ? (
                                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                  <CalendarIcon />
                                  {dueLabel}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <TableRowActionsMenu
                            onEdit={() => openEdit(task)}
                            onDelete={() => handleDeleteTask(task)}
                            isDeleting={busy}
                            extraItems={[
                              {
                                label: isDone ? "פתח מחדש" : "סמן כהושלם",
                                onClick: () => handleToggleTask(task),
                                disabled: busy,
                              },
                            ]}
                          />
                        </div>

                        {task.description ? (
                          <p
                            className={`mt-3 rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                              isDone
                                ? "bg-slate-100/80 text-slate-400"
                                : "bg-slate-50 text-slate-600"
                            }`}
                          >
                            {task.description}
                          </p>
                        ) : null}

                        {taskSubtasks.length > 0 ? (
                          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-500">תתי-משימות</p>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                                {doneSubtasks}/{taskSubtasks.length} הושלמו
                              </span>
                            </div>
                            <ul className="space-y-1">
                              {taskSubtasks.map((subtask) => {
                                const subtaskDone = subtask.status === "done";
                                const subtaskBusy = busyIds.has(subtask.id);
                                const isEditing = editingSubtaskId === subtask.id;

                                return (
                                  <li
                                    key={subtask.id}
                                    className="group flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-100 transition hover:ring-slate-200"
                                  >
                                    <button
                                      type="button"
                                      disabled={subtaskBusy}
                                      onClick={() => handleToggleSubtask(subtask)}
                                      aria-label={subtaskDone ? "פתח מחדש" : "סמן כהושלם"}
                                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                                        subtaskDone
                                          ? "border-emerald-500 bg-emerald-500 text-white"
                                          : "border-slate-300 bg-white text-transparent hover:border-emerald-400"
                                      } disabled:opacity-50`}
                                    >
                                      <CheckIcon small />
                                    </button>

                                    {isEditing ? (
                                      <span className="flex flex-1 flex-wrap items-center gap-1.5">
                                        <input
                                          type="text"
                                          value={subtaskEditDraft.title}
                                          disabled={subtaskBusy}
                                          onChange={(event) =>
                                            setSubtaskEditDraft((current) => ({
                                              ...current,
                                              title: event.target.value,
                                            }))
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter") handleSaveSubtaskEdit(subtask);
                                            if (event.key === "Escape") setEditingSubtaskId(null);
                                          }}
                                          autoFocus
                                          className="h-8 min-w-40 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-blue-300"
                                        />
                                        <select
                                          value={subtaskEditDraft.assignee}
                                          disabled={subtaskBusy}
                                          onChange={(event) =>
                                            setSubtaskEditDraft((current) => ({
                                              ...current,
                                              assignee: event.target.value,
                                            }))
                                          }
                                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-300"
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
                                          onClick={() => handleSaveSubtaskEdit(subtask)}
                                          className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                                        >
                                          שמור
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingSubtaskId(null)}
                                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 transition hover:bg-slate-50"
                                        >
                                          ביטול
                                        </button>
                                      </span>
                                    ) : (
                                      <>
                                        <span
                                          className={`flex-1 text-sm ${
                                            subtaskDone
                                              ? "text-slate-400 line-through"
                                              : "text-slate-700"
                                          }`}
                                        >
                                          {subtask.title}
                                        </span>
                                        {subtask.assignee ? (
                                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-100">
                                            {subtask.assignee}
                                          </span>
                                        ) : null}
                                        <span className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                                          <button
                                            type="button"
                                            disabled={subtaskBusy}
                                            onClick={() => {
                                              setEditingSubtaskId(subtask.id);
                                              setSubtaskEditDraft({
                                                title: subtask.title,
                                                assignee: subtask.assignee ?? "",
                                              });
                                            }}
                                            className="rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                          >
                                            ערוך
                                          </button>
                                          <button
                                            type="button"
                                            disabled={subtaskBusy}
                                            onClick={() => handleDeleteSubtask(subtask)}
                                            className="rounded-md px-1.5 py-0.5 text-[11px] text-red-400 transition hover:bg-red-50 hover:text-red-600"
                                          >
                                            מחק
                                          </button>
                                        </span>
                                      </>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : null}

                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-2 py-1 transition focus-within:border-blue-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
                          <PlusIcon />
                          <input
                            type="text"
                            value={newSubtaskTitles[task.id] ?? ""}
                            disabled={busy}
                            placeholder="הוסף תת-משימה..."
                            onChange={(event) =>
                              setNewSubtaskTitles((current) => ({
                                ...current,
                                [task.id]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") handleAddSubtask(task.id);
                            }}
                            className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                          />
                          {(newSubtaskTitles[task.id] ?? "").trim() ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleAddSubtask(task.id)}
                              className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                            >
                              הוסף
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
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

function CheckIcon({ small = false }: { small?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={small ? "h-3 w-3" : "h-3.5 w-3.5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 2v3M16 2v3M4 9h16" strokeLinecap="round" />
      <path d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
