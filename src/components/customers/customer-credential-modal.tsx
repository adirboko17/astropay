"use client";

import { useEffect, useState } from "react";

import type { CredentialFormData } from "@/lib/credentials/constants";
import { getPlatformBadgeClass } from "@/lib/credentials/platform-ui";
import type { CredentialTable } from "@/types/database";

interface CustomerCredentialModalProps {
  mode: "create" | "edit";
  tables: CredentialTable[];
  initialTableId: string | null;
  draft: CredentialFormData;
  isSaving: boolean;
  onChange: (field: keyof CredentialFormData, value: string) => void;
  onClose: () => void;
  onSave: (tableId: string) => void;
}

export function CustomerCredentialModal({
  mode,
  tables,
  initialTableId,
  draft,
  isSaving,
  onChange,
  onClose,
  onSave,
}: CustomerCredentialModalProps) {
  const [tableId, setTableId] = useState(initialTableId ?? tables[0]?.id ?? "");

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isSaving, onClose]);

  const selectedTableName = tables.find((table) => table.id === tableId)?.name ?? "";

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
        aria-labelledby="customer-credential-title"
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h3 id="customer-credential-title" className="text-lg font-semibold text-slate-900">
          {mode === "create" ? "הוספת פרטי התחברות" : "עריכת פרטי התחברות"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">הרשומה תישמר תחת הלקוח הנוכחי</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-slate-500">טבלה / פלטפורמה</span>
            {mode === "edit" ? (
              <div
                className={`flex h-11 items-center rounded-xl px-3 text-sm font-medium ${getPlatformBadgeClass(selectedTableName)}`}
              >
                {selectedTableName}
              </div>
            ) : (
              <select
                value={tableId}
                disabled={isSaving}
                onChange={(event) => setTableId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
              >
                {tables.length === 0 ? <option value="">אין טבלאות — צור טבלה תחילה</option> : null}
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
              </select>
            )}
          </label>

          <Field
            label="אימייל"
            value={draft.login_email}
            disabled={isSaving}
            placeholder="email@example.com"
            onChange={(value) => onChange("login_email", value)}
          />
          <Field
            label="משתמש"
            value={draft.login_username}
            disabled={isSaving}
            placeholder="username"
            onChange={(value) => onChange("login_username", value)}
          />
          <Field
            label="סיסמה"
            value={draft.password}
            disabled={isSaving}
            type="password"
            placeholder="••••••"
            onChange={(value) => onChange("password", value)}
          />
          <Field
            label="אתר"
            value={draft.website_url}
            disabled={isSaving}
            placeholder="https://..."
            onChange={(value) => onChange("website_url", value)}
          />
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
            disabled={isSaving || !tableId}
            onClick={() => onSave(tableId)}
            className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isSaving ? "שומר..." : mode === "create" ? "+ הוסף רשומה" : "שמור שינויים"}
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
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  placeholder?: string;
  type?: "text" | "password";
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
      />
    </label>
  );
}
