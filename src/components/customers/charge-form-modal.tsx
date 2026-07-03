"use client";

import { useEffect } from "react";

import type { ChargeFormData } from "@/app/customers/actions";

interface ChargeFormModalProps {
  mode: "create" | "edit";
  draft: ChargeFormData;
  isSaving: boolean;
  onChange: (field: keyof ChargeFormData, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function ChargeFormModal({
  mode,
  draft,
  isSaving,
  onChange,
  onClose,
  onSave,
}: ChargeFormModalProps) {
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
        aria-labelledby="charge-form-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h3 id="charge-form-title" className="text-lg font-semibold text-slate-900">
          {mode === "create" ? "חיוב / שירות חדש" : "עריכת חיוב"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          כל שירות שהלקוח לוקח ממך יכול לקבל סכום גבייה נפרד שלו
        </p>

        <div className="mt-5 grid gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-500">שם השירות / חיוב</span>
            <input
              type="text"
              value={draft.title}
              disabled={isSaving}
              placeholder="לדוגמה: עיצוב אתר, תחזוקה חודשית..."
              onChange={(event) => onChange("title", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">סכום לגבייה</span>
              <input
                type="number"
                value={draft.amount}
                disabled={isSaving}
                placeholder="0"
                onChange={(event) => onChange("amount", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
              />
            </label>
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
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-500">הערות</span>
            <input
              type="text"
              value={draft.notes}
              disabled={isSaving}
              placeholder="הערה נוספת..."
              onChange={(event) => onChange("notes", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={isSaving || !draft.title.trim()}
            onClick={onSave}
            className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isSaving ? "שומר..." : mode === "create" ? "+ הוסף חיוב" : "שמור שינויים"}
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
