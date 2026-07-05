"use client";

import { useEffect } from "react";

import { CUSTOMER_STATUSES, type CustomerFormData } from "@/lib/customers/constants";

interface CustomerFormModalProps {
  mode: "create" | "edit";
  variant?: "customer" | "project";
  draft: CustomerFormData;
  isSaving: boolean;
  hasCharges?: boolean;
  onChange: (field: keyof CustomerFormData, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function CustomerFormModal({
  mode,
  variant = "customer",
  draft,
  isSaving,
  hasCharges = false,
  onChange,
  onClose,
  onSave,
}: CustomerFormModalProps) {
  const isProject = variant === "project";
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isSaving, onClose]);

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
        aria-labelledby="customer-form-title"
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h3 id="customer-form-title" className="text-lg font-semibold text-slate-900">
          {mode === "create"
            ? isProject
              ? "פרויקט חדש"
              : "לקוח חדש"
            : isProject
              ? "עריכת פרטי פרויקט"
              : "עריכת פרטי לקוח"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {isProject
            ? "פרטי הקשר של הפרויקט — ניתן לעדכן בכל עת"
            : "פרטי הקשר וסכום הגבייה הכולל — ניתן לעדכן בכל עת"}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field
              label={isProject ? "שם פרויקט" : "שם לקוח"}
              value={draft.name}
              disabled={isSaving}
              placeholder={isProject ? "שם הפרויקט" : "שם הלקוח / החברה"}
              onChange={(value) => onChange("name", value)}
              required
            />
          </div>
          <Field
            label="חברה"
            value={draft.company}
            disabled={isSaving}
            placeholder="שם החברה (אופציונלי)"
            onChange={(value) => onChange("company", value)}
          />
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-500">סטטוס</span>
            <select
              value={draft.status}
              disabled={isSaving}
              onChange={(event) => onChange("status", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
            >
              {CUSTOMER_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="אימייל"
            value={draft.email}
            disabled={isSaving}
            placeholder="email@example.com"
            onChange={(value) => onChange("email", value)}
          />
          <Field
            label="טלפון"
            value={draft.phone}
            disabled={isSaving}
            placeholder="05X-XXXXXXX"
            onChange={(value) => onChange("phone", value)}
          />
          {!isProject ? (
            <>
              <div>
                <Field
                  label="סכום כולל לגבייה"
                  value={draft.total_amount_due}
                  disabled={isSaving || hasCharges}
                  placeholder="0"
                  type="number"
                  onChange={(value) => onChange("total_amount_due", value)}
                />
                {hasCharges ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    מנוהל אוטומטית לפי החיובים/השירותים בכרטיס הלקוח
                  </p>
                ) : null}
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-500">מטבע</span>
                <select
                  value={draft.currency}
                  disabled={isSaving}
                  onChange={(event) => onChange("currency", event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
                >
                  <option value="ILS">שקל (ILS)</option>
                  <option value="USD">דולר (USD)</option>
                  <option value="EUR">יורו (EUR)</option>
                </select>
              </label>
            </>
          ) : null}
          <div className="sm:col-span-2">
            <Field
              label="הערות"
              value={draft.notes}
              disabled={isSaving}
              placeholder="הערות נוספות..."
              onChange={(value) => onChange("notes", value)}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={isSaving || !draft.name.trim()}
            onClick={onSave}
            className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isSaving
              ? "שומר..."
              : mode === "create"
                ? isProject
                  ? "+ הוסף פרויקט"
                  : "+ הוסף לקוח"
                : "שמור שינויים"}
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

function Field({
  label,
  value,
  disabled,
  placeholder,
  type = "text",
  required,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  placeholder?: string;
  type?: "text" | "number";
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
      />
    </label>
  );
}
