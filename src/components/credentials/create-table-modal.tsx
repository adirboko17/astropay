"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createCredentialTableFormAction,
  type CreateCredentialTableState,
} from "@/app/credentials/actions";

const initialCreateState: CreateCredentialTableState = {
  error: null,
  id: null,
  name: null,
};

interface CreateTableModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (table: { id: string; name: string }) => void;
}

export function CreateTableModal({ open, onClose, onCreated }: CreateTableModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handledCreateId = useRef<string | null>(null);
  const [createState, createFormAction, isCreating] = useActionState(
    createCredentialTableFormAction,
    initialCreateState,
  );

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!createState.id || !createState.name) return;
    if (handledCreateId.current === createState.id) return;

    handledCreateId.current = createState.id;
    formRef.current?.reset();
    onCreated({ id: createState.id, name: createState.name });
    onClose();
  }, [createState, onClose, onCreated]);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isCreating) onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, isCreating, onClose]);

  if (!open) return null;

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
        aria-labelledby="create-table-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h3 id="create-table-title" className="text-lg font-semibold text-slate-900">
          טבלה חדשה
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          הזן שם לטבלה — למשל Supabase, Gmail או Vercel
        </p>

        <form ref={formRef} action={createFormAction} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="table-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              שם הטבלה
            </label>
            <input
              ref={inputRef}
              id="table-name"
              type="text"
              name="name"
              required
              autoComplete="off"
              disabled={isCreating}
              placeholder="למשל Gmail"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
            />
          </div>

          {createState.error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {createState.error}
            </div>
          ) : null}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isCreating}
              className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
            >
              {isCreating ? "יוצר..." : "צור טבלה"}
            </button>
            <button
              type="button"
              disabled={isCreating}
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
