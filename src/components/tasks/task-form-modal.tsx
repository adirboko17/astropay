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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="סגור"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h3 id="task-form-title" className="text-lg font-semibold text-slate-900">
          {mode === "create" ? "משימה חדשה" : "עריכת משימה"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          שיוך לפי לקוח, פרויקט או נושא כללי — עם אחראי לביצוע
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">כותרת המשימה *</span>
              <input
                type="text"
                value={draft.title}
                disabled={isSaving}
                placeholder="מה צריך לעשות?"
                onChange={(event) => onChange("title", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
              />
            </label>
          </div>

          <SearchableCombobox
            label="קטגוריה"
            value={draft.category}
            options={[...CATEGORY_OPTIONS]}
            placeholder="חפש או בחר: לקוח / פרויקט / אחר"
            disabled={isSaving}
            allowClear={false}
            onChange={handleCategoryChange}
          />

          {draft.category === "other" ? (
            <SearchableCombobox
              label="נושא / תיאור"
              value={draft.context_label}
              options={[]}
              placeholder="הקלד נושא כללי..."
              disabled={isSaving}
              allowClear={false}
              freeText
              onChange={(value) => onChange("context_label", value)}
            />
          ) : (
            <SearchableCombobox
              label={draft.category === "customer" ? "לקוח מקושר" : "פרויקט מקושר"}
              value={draft.customer_id}
              options={linkedOptions}
              placeholder={
                draft.category === "customer"
                  ? "חפש לקוח..."
                  : "חפש פרויקט..."
              }
              disabled={isSaving}
              onChange={(value) => onChange("customer_id", value)}
            />
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-500">אחראי</span>
            <select
              value={draft.assignee}
              disabled={isSaving}
              onChange={(event) => onChange("assignee", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
            >
              <option value="">— ללא אחראי —</option>
              {TASK_ASSIGNEES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-500">תאריך יעד</span>
            <input
              type="date"
              value={draft.due_date}
              disabled={isSaving}
              onChange={(event) => onChange("due_date", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
            />
          </label>

          <div className="sm:col-span-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">תיאור</span>
              <textarea
                value={draft.description}
                disabled={isSaving}
                rows={3}
                placeholder="פרטים נוספים על המשימה..."
                onChange={(event) => onChange("description", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={isSaving || !draft.title.trim()}
            onClick={onSave}
            className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isSaving ? "שומר..." : mode === "create" ? "+ צור משימה" : "שמור שינויים"}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
