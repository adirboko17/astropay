"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  createCredentialTableFormAction,
  deleteCredentialTable,
  type CreateCredentialTableState,
} from "@/app/credentials/actions";
import { getPlatformBadgeClass } from "@/lib/credentials/platform-ui";
import { countCredentialsForTable } from "@/lib/credentials/tables";
import type { ClientCredential, CredentialTable } from "@/types/database";

interface CredentialTableTabsProps {
  tables: CredentialTable[];
  activeTableId: string | null;
  credentials: ClientCredential[];
  onSelect: (tableId: string | null) => void;
  onTableCreated: (table: CredentialTable) => void;
  onTableDeleted: (tableId: string) => void;
}

const initialCreateState: CreateCredentialTableState = {
  error: null,
  id: null,
  name: null,
};

export function CredentialTableTabs({
  tables,
  activeTableId,
  credentials,
  onSelect,
  onTableCreated,
  onTableDeleted,
}: CredentialTableTabsProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const handledCreateId = useRef<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createState, createFormAction, isCreating] = useActionState(
    createCredentialTableFormAction,
    initialCreateState,
  );
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);

  useEffect(() => {
    if (!createState.id || !createState.name) return;
    if (handledCreateId.current === createState.id) return;

    handledCreateId.current = createState.id;

    const createdTable: CredentialTable = {
      id: createState.id,
      name: createState.name,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onTableCreated(createdTable);
    onSelect(createState.id);
    formRef.current?.reset();
    setCreateModalOpen(false);
    router.push(`/credentials?table=${createState.id}`);
    router.refresh();
  }, [createState, onSelect, onTableCreated, router]);

  useEffect(() => {
    if (!createModalOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isCreating) {
        setCreateModalOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [createModalOpen, isCreating]);

  async function handleDeleteTable(table: CredentialTable) {
    if (!window.confirm(`למחוק את הטבלה "${table.name}"?`)) return;

    setDeletingTableId(table.id);
    setDeleteMessage(null);

    try {
      const result = await deleteCredentialTable(table.id);

      if (result.error) {
        setDeleteMessage(result.error);
        return;
      }

      onTableDeleted(table.id);
      onSelect(null);
      router.push("/credentials");
      router.refresh();
    } catch {
      setDeleteMessage("שגיאה בלתי צפויה במחיקת הטבלה");
    } finally {
      setDeletingTableId(null);
    }
  }

  const message = deleteMessage;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">הטבלאות שלי</h2>
            <p className="mt-1 text-sm text-slate-500">
              צור טבלה חדשה רק כשאתה צריך — בלי רשימה מוכנה מראש
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="h-11 shrink-0 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + טבלה
          </button>
        </div>

        {message ? (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
            {message}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 px-5 py-4">
          <TableTab
            label="הכל"
            count={countCredentialsForTable(credentials, null)}
            active={activeTableId === null}
            onClick={() => onSelect(null)}
          />

          {tables.length === 0 ? (
            <p className="self-center text-sm text-slate-400">
              עדיין אין טבלאות — לחץ על + טבלה ליצירת הראשונה
            </p>
          ) : (
            tables.map((table) => (
              <TableTab
                key={table.id}
                label={table.name}
                count={countCredentialsForTable(credentials, table.id)}
                active={activeTableId === table.id}
                badgeClass={getPlatformBadgeClass(table.name)}
                disabled={deletingTableId === table.id}
                onDelete={() => handleDeleteTable(table)}
                onClick={() => onSelect(table.id)}
              />
            ))
          )}
        </div>
      </div>

      {createModalOpen ? (
        <CreateTableModal
          formRef={formRef}
          formAction={createFormAction}
          isCreating={isCreating}
          error={createState.error}
          onClose={() => {
            if (!isCreating) setCreateModalOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function CreateTableModal({
  formRef,
  formAction,
  isCreating,
  error,
  onClose,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  formAction: (payload: FormData) => void;
  isCreating: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          הזן שם לטבלה — למשל Supabase, Vercel או Excel
        </p>

        <form ref={formRef} action={formAction} className="mt-5 space-y-4">
          <div>
            <label htmlFor="table-name" className="mb-1.5 block text-sm font-medium text-slate-700">
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
              placeholder="למשל Vercel"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
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

function TableTab({
  label,
  count,
  active,
  badgeClass,
  disabled,
  onClick,
  onDelete,
}: {
  label: string;
  count: number;
  active: boolean;
  badgeClass?: string;
  disabled?: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`inline-flex shrink-0 items-center gap-1 rounded-xl border transition ${
        active
          ? "border-blue-200 bg-blue-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium ${
          active ? "text-blue-800" : "text-slate-600"
        }`}
      >
        <span className={active && badgeClass ? `${badgeClass} rounded-md px-2 py-0.5` : ""}>
          {label}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      </button>
      {onDelete ? (
        <button
          type="button"
          title="מחק טבלה ריקה"
          disabled={disabled}
          onClick={onDelete}
          className="px-2 py-2 text-xs text-slate-400 transition hover:text-red-600 disabled:opacity-50"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
