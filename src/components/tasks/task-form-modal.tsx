"use client";

import { useEffect, useMemo } from "react";

import type { TaskFormData } from "@/app/tasks/actions";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import type { Customer } from "@/types/database";

export const TASK_ASSIGNEES = ["אדיר", "איתי"] as const;

const CATEGORY_OPTIONS = [
  { value: "customer", label: "לקוח" },
  { value: "project", label: "פרויקט" },
  { value: "other", label: "אחר" },
] as const;

interface TaskFormModalProps {
  mode: "create" | "edit";
  draft: TaskFormData;
  billingCustomers: Customer[];
  projectCustomers: Customer[];
  isSaving: boolean;
  onChange: (field: keyof TaskFormData, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function TaskFormModal({
  mode,
  draft,
  billingCustomers,
  projectCustomers,
  isSaving,
  onChange,
  onClose,
  onSave,
}: TaskFormModalProps) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isSaving, onClose]);

  const linkedOptions = useMemo(() => {
    const list =
      draft.category === "customer"
        ? billingCustomers
        : draft.category === "project"
          ? projectCustomers
          : [];

    return list.map((customer) => ({
      value: customer.id,
      label: customer.name,
      hint: customer.company ?? undefined,
    }));
  }, [draft.category, billingCustomers, projectCustomers]);

  function handleCategoryChange(value: string) {
    const category = (value || "customer") as TaskFormData["category"];
    onChange("category", category);
    onChange("customer_id", "");
    onChange("context_label", "");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="סגור"
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-[3px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        className="relative flex max-h-[calc(100vh-24px)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.3)] sm:max-h-[calc(100vh-48px)]"
      >
        <div className="relative border-b border-slate-100 bg-gradient-to-l from-indigo-50/80 via-white to-blue-50/60 px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-200">
              <TaskIcon />
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="task-form-title" className="text-xl font-bold tracking-tight text-slate-900">
                {mode === "create" ? "יצירת משימה חדשה" : "עריכת משימה"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {mode === "create"
                  ? "מגדירים את המשימה, משייכים ללקוח ובוחרים אחראי"
                  : "עדכון פרטי המשימה והשיוך שלה"}
              </p>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              aria-label="סגור"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-400 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                כותרת המשימה
                <span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                value={draft.title}
                disabled={isSaving}
                autoFocus
                placeholder="לדוגמה: להכין סקיצה לעמוד הבית"
                onChange={(event) => onChange("title", event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-50"
              />
            </label>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700">סוג המשימה</legend>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORY_OPTIONS.map((option) => {
                  const selected = draft.category === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isSaving}
                      aria-pressed={selected}
                      onClick={() => handleCategoryChange(option.value)}
                      className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-semibold transition ${
                        selected
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-100"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      } disabled:opacity-50`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <CategoryOptionIcon category={option.value} />
                      </span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              {draft.category === "other" ? (
                <SearchableCombobox
                  label="נושא כללי"
                  value={draft.context_label}
                  options={[]}
                  placeholder="לדוגמה: תפעול פנימי"
                  disabled={isSaving}
                  allowClear={false}
                  freeText
                  onChange={(value) => onChange("context_label", value)}
                />
              ) : (
                <SearchableCombobox
                  label={draft.category === "customer" ? "לאיזה לקוח המשימה שייכת?" : "לאיזה פרויקט המשימה שייכת?"}
                  value={draft.customer_id}
                  options={linkedOptions}
                  placeholder={
                    draft.category === "customer"
                      ? "חיפוש ובחירת לקוח..."
                      : "חיפוש ובחירת פרויקט..."
                  }
                  disabled={isSaving}
                  onChange={(value) => onChange("customer_id", value)}
                />
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-slate-700">אחראי לביצוע</legend>
                <div className="flex gap-2">
                  {["", ...TASK_ASSIGNEES].map((name) => {
                    const selected = draft.assignee === name;
                    return (
                      <button
                        key={name || "none"}
                        type="button"
                        disabled={isSaving}
                        onClick={() => onChange("assignee", name)}
                        className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold transition ${
                          selected
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        } disabled:opacity-50`}
                      >
                        {name ? <AssigneeInitials name={name} /> : <UnassignedIcon />}
                        <span className="truncate">{name || "ללא"}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">תאריך יעד</span>
                <input
                  type="date"
                  value={draft.due_date}
                  disabled={isSaving}
                  onChange={(event) => onChange("due_date", event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 disabled:opacity-50"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
                <span>פרטים נוספים</span>
                <span className="text-[11px] font-normal text-slate-400">אופציונלי</span>
              </span>
              <textarea
                value={draft.description}
                disabled={isSaving}
                rows={4}
                placeholder="הוסיפו הנחיות, קישורים או כל מידע שיעזור להשלים את המשימה..."
                onChange={(event) => onChange("description", event.target.value)}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-50"
              />
            </label>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
          <button
            type="button"
            disabled={isSaving || !draft.title.trim()}
            onClick={onSave}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-indigo-600 to-blue-600 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <SpinnerIcon />
                שומר...
              </>
            ) : (
              <>
                {mode === "create" ? <PlusIcon /> : <SaveIcon />}
                {mode === "create" ? "יצירת המשימה" : "שמירת השינויים"}
              </>
            )}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m9 14 2 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CategoryOptionIcon({ category }: { category: TaskFormData["category"] }) {
  if (category === "customer") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M16 5a3 3 0 0 1 0 6M18 14a4 4 0 0 1 3 4v2" strokeLinecap="round" />
      </svg>
    );
  }

  if (category === "project") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19V9M10 19V5M16 19v-7M22 19V8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-6l-2-2H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1Z" />
    </svg>
  );
}

function AssigneeInitials({ name }: { name: string }) {
  const tone =
    name === "אדיר"
      ? "from-indigo-500 to-blue-600"
      : "from-fuchsia-500 to-violet-600";

  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white ${tone}`}
    >
      {name.slice(0, 2)}
    </span>
  );
}

function UnassignedIcon() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3" />
        <path d="M6 20v-1a6 6 0 0 1 12 0v1M5 5l14 14" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 4h12l2 2v14H5V4Z" />
      <path d="M8 4v6h8V4M8 20v-6h8v6" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
