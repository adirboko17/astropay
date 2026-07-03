"use client";

import { useEffect } from "react";

import type { PaymentFormData } from "@/app/customers/actions";
import type { CustomerCharge } from "@/types/database";

interface PaymentFormModalProps {
  mode: "create" | "edit";
  draft: PaymentFormData;
  charges?: CustomerCharge[];
  isSaving: boolean;
  onChange: (field: keyof PaymentFormData, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function PaymentFormModal({
  mode,
  draft,
  charges = [],
  isSaving,
  onChange,
  onClose,
  onSave,
}: PaymentFormModalProps) {
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
        aria-labelledby="payment-form-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h3 id="payment-form-title" className="text-lg font-semibold text-slate-900">
          {mode === "create" ? "רישום תשלום" : "עריכת תשלום"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">התשלום ייווסף להיסטוריית הגבייה של הלקוח</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {charges.length > 0 ? (
            <div className="sm:col-span-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-500">עבור איזה שירות / חיוב</span>
                <select
                  value={draft.charge_id}
                  disabled={isSaving}
                  onChange={(event) => onChange("charge_id", event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
                >
                  <option value="">כללי — לא משויך לחיוב מסוים</option>
                  {charges.map((charge) => (
                    <option key={charge.id} value={charge.id}>
                      {charge.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-500">סכום</span>
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
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-500">תאריך תשלום</span>
            <input
              type="date"
              value={draft.paid_at}
              disabled={isSaving}
              onChange={(event) => onChange("paid_at", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-500">אמצעי תשלום</span>
            <input
              type="text"
              value={draft.method}
              disabled={isSaving}
              placeholder="העברה בנקאית / כרטיס אשראי..."
              onChange={(event) => onChange("method", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
            />
          </label>
          <div className="sm:col-span-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">הערה</span>
              <input
                type="text"
                value={draft.note}
                disabled={isSaving}
                placeholder="הערה נוספת..."
                onChange={(event) => onChange("note", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={isSaving || !draft.amount.trim()}
            onClick={onSave}
            className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isSaving ? "שומר..." : mode === "create" ? "+ הוסף תשלום" : "שמור שינויים"}
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
