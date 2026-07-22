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
        aria-labelledby="customer-form-title"
        className="relative flex max-h-[calc(100vh-24px)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.3)] sm:max-h-[calc(100vh-48px)]"
      >
        <div
          className={`border-b border-slate-100 bg-gradient-to-l px-5 py-5 sm:px-7 ${
            isProject
              ? "from-violet-50/80 via-white to-fuchsia-50/50"
              : "from-blue-50/80 via-white to-indigo-50/60"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${
                isProject
                  ? "from-violet-500 to-fuchsia-600 shadow-violet-200"
                  : "from-blue-500 to-indigo-600 shadow-blue-200"
              }`}
            >
              {isProject ? <ProjectIcon /> : <CustomerIcon />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="customer-form-title" className="text-xl font-bold tracking-tight text-slate-900">
                {mode === "create"
                  ? isProject
                    ? "יצירת פרויקט חדש"
                    : "יצירת לקוח חדש"
                  : isProject
                    ? "עריכת פרטי פרויקט"
                    : "עריכת פרטי לקוח"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {mode === "create"
                  ? isProject
                    ? "מוסיפים פרטי פרויקט ופרטי קשר"
                    : "מוסיפים פרטי לקוח, איש קשר ונתוני גבייה"
                  : "עדכון הפרטים השמורים במערכת"}
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
            <Field
              label={isProject ? "שם הפרויקט" : "שם הלקוח"}
              value={draft.name}
              disabled={isSaving}
              placeholder={isProject ? "שם הפרויקט" : "שם הלקוח / החברה"}
              onChange={(value) => onChange("name", value)}
              required
              autoFocus
            />

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700">סטטוס</legend>
              <div className="grid grid-cols-3 gap-2">
                {CUSTOMER_STATUSES.map((option) => {
                  const selected = draft.status === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isSaving}
                      aria-pressed={selected}
                      onClick={() => onChange("status", option.value)}
                      className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-semibold transition ${
                        selected
                          ? isProject
                            ? "border-violet-300 bg-violet-50 text-violet-700 ring-2 ring-violet-100"
                            : "border-blue-300 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      } disabled:opacity-50`}
                    >
                      <StatusDot status={option.value} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                פרטי קשר
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="חברה"
                  value={draft.company}
                  disabled={isSaving}
                  placeholder="שם החברה (אופציונלי)"
                  onChange={(value) => onChange("company", value)}
                />
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
              </div>
            </div>

            {!isProject ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-500">
                  הגדרות גבייה
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
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
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        מנוהל אוטומטית לפי החיובים בכרטיס הלקוח
                      </p>
                    ) : null}
                  </div>
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-700">מטבע</span>
                    <select
                      value={draft.currency}
                      disabled={isSaving}
                      onChange={(event) => onChange("currency", event.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
                    >
                      <option value="ILS">שקל (ILS)</option>
                      <option value="USD">דולר (USD)</option>
                      <option value="EUR">יורו (EUR)</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            <label className="block space-y-2">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
                <span>הערות</span>
                <span className="text-[11px] font-normal text-slate-400">אופציונלי</span>
              </span>
              <textarea
                value={draft.notes}
                disabled={isSaving}
                rows={3}
                placeholder="הערות, פרטים חשובים או מידע נוסף..."
                onChange={(event) => onChange("notes", event.target.value)}
                className={`w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 disabled:opacity-50 ${
                  isProject
                    ? "focus:border-violet-300 focus:ring-violet-100"
                    : "focus:border-blue-300 focus:ring-blue-100"
                }`}
              />
            </label>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
          <button
            type="button"
            disabled={isSaving || !draft.name.trim()}
            onClick={onSave}
            className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-l text-sm font-bold text-white shadow-lg transition disabled:cursor-wait disabled:opacity-60 ${
              isProject
                ? "from-violet-600 to-fuchsia-600 shadow-violet-200 hover:from-violet-700 hover:to-fuchsia-700"
                : "from-blue-600 to-indigo-600 shadow-blue-200 hover:from-blue-700 hover:to-indigo-700"
            }`}
          >
            {isSaving ? (
              <>
                <SpinnerIcon />
                שומר...
              </>
            ) : (
              <>
                {mode === "create" ? <PlusIcon /> : <SaveIcon />}
                {mode === "create"
                  ? isProject
                    ? "יצירת הפרויקט"
                    : "יצירת הלקוח"
                  : "שמירת השינויים"}
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

function Field({
  label,
  value,
  disabled,
  placeholder,
  type = "text",
  required,
  autoFocus,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  placeholder?: string;
  type?: "text" | "number";
  required?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
      />
    </label>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active"
      ? "bg-emerald-500"
      : status === "lead"
        ? "bg-amber-500"
        : "bg-slate-400";
  return <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />;
}

function CustomerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M16 5a3 3 0 0 1 0 6M18 14a4 4 0 0 1 3 4v2" strokeLinecap="round" />
    </svg>
  );
}

function ProjectIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 20h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-5l-2-2H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 4h12l2 2v14H5V4Z" />
      <path d="M8 4v6h8V4M8 20v-6h8v6" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
