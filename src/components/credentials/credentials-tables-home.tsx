"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  deleteCredentialTable,
  updateCredentialTableName,
} from "@/app/credentials/actions";
import { CreateTableModal } from "@/components/credentials/create-table-modal";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import {
  buildTableListItems,
  formatTableDate,
  getTableIconColor,
  groupTablesByRecency,
  type TableListItem,
} from "@/lib/credentials/table-home";
import type { ClientCredential, CredentialTable } from "@/types/database";

interface CredentialsTablesHomeProps {
  initialTables: CredentialTable[];
  initialCredentials: Pick<ClientCredential, "table_id">[];
}

export function CredentialsTablesHome({
  initialTables,
  initialCredentials,
}: CredentialsTablesHomeProps) {
  const router = useRouter();
  const [tables, setTables] = useSyncedState(initialTables);
  const [credentials] = useSyncedState(initialCredentials);
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);
  const [savingTableId, setSavingTableId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<TableListItem | null>(null);
  const [deletingTable, setDeletingTable] = useState<TableListItem | null>(
    null,
  );

  const tableItems = useMemo(() => {
    const items = buildTableListItems(tables, credentials);
    const needle = searchQuery.trim().toLowerCase();

    if (!needle) return items;

    return items.filter((item) => item.name.toLowerCase().includes(needle));
  }, [credentials, searchQuery, tables]);

  const groupedTables = useMemo(
    () => groupTablesByRecency(tableItems),
    [tableItems],
  );

  async function handleDeleteTable(table: TableListItem) {
    setDeletingTableId(table.id);
    setActionMessage(null);

    try {
      const result = await deleteCredentialTable(table.id);

      if (result.error) {
        setActionMessage(result.error);
        return;
      }

      setTables((current) => current.filter((item) => item.id !== table.id));
      setDeletingTable(null);
      setOpenMenuId(null);
      router.refresh();
    } catch {
      setActionMessage("שגיאה בלתי צפויה במחיקת הטבלה");
    } finally {
      setDeletingTableId(null);
    }
  }

  async function handleRenameTable(table: TableListItem, name: string) {
    setSavingTableId(table.id);
    setActionMessage(null);

    try {
      const result = await updateCredentialTableName(table.id, name);

      if (result.error) {
        setActionMessage(result.error);
        return;
      }

      setTables((current) =>
        current.map((item) =>
          item.id === table.id ? { ...item, name: name.trim() } : item,
        ),
      );
      setEditingTable(null);
      setOpenMenuId(null);
      router.refresh();
    } catch {
      setActionMessage("שגיאה בלתי צפויה בעדכון שם הטבלה");
    } finally {
      setSavingTableId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <KeyIcon />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
                Credentials
              </p>
              <h1 className="mt-0.5 text-xl font-bold text-slate-950 sm:text-2xl">
                פרטי התחברות
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                סיסמאות וחשבונות מאורגנים לפי פלטפורמה
              </p>
            </div>
          </div>
        </div>

        <div className="grid border-t border-slate-100 sm:grid-cols-3">
          <HeaderMetric label="טבלאות" value={String(tables.length)} />
          <HeaderMetric label="רשומות" value={String(credentials.length)} tone="blue" />
          <HeaderMetric
            label="ממוצע רשומות לטבלה"
            value={tables.length > 0 ? String(Math.round(credentials.length / tables.length)) : "0"}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="relative z-20 border-b border-slate-100 p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <TableIcon />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">הטבלאות שלי</h2>
                <p className="text-xs text-slate-400">
                  מציג {tableItems.length} מתוך {tables.length} טבלאות
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row xl:max-w-2xl">
              <div className="relative min-w-0 flex-1">
                <SearchIcon />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="חיפוש בטבלאות..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pe-10 ps-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="נקה חיפוש"
                    className="absolute end-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  >
                    <ClearIcon />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <PlusIcon />
                טבלה חדשה
              </button>
            </div>
          </div>
        </div>

        {actionMessage ? (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
            {actionMessage}
          </div>
        ) : null}

        <div className="overflow-x-auto p-2">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[minmax(300px,1fr)_110px_145px_145px_48px] items-center px-4 py-2.5 text-[11px] font-semibold text-slate-500">
              <span>שם הטבלה</span>
              <span>רשומות</span>
              <span>צפייה אחרונה</span>
              <span>עדכון אחרון</span>
              <span />
            </div>

          {tableItems.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-600">
              {searchQuery.trim() ? "לא נמצאו טבלאות" : "עדיין אין טבלאות"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {searchQuery.trim()
                ? "נסה חיפוש אחר"
                : "לחץ על + טבלה חדשה כדי להתחיל"}
            </p>
          </div>
        ) : (
              <div className="space-y-3">
            <TableGroup
              title="היום"
              items={groupedTables.today}
              deletingTableId={deletingTableId}
              savingTableId={savingTableId}
              openMenuId={openMenuId}
              onOpenMenu={setOpenMenuId}
              onEdit={setEditingTable}
              onDelete={setDeletingTable}
            />
            <TableGroup
              title="7 הימים האחרונים"
              items={groupedTables.lastWeek}
              deletingTableId={deletingTableId}
              savingTableId={savingTableId}
              openMenuId={openMenuId}
              onOpenMenu={setOpenMenuId}
              onEdit={setEditingTable}
              onDelete={setDeletingTable}
            />
            <TableGroup
              title="מוקדם יותר"
              items={groupedTables.older}
              deletingTableId={deletingTableId}
              savingTableId={savingTableId}
              openMenuId={openMenuId}
              onOpenMenu={setOpenMenuId}
              onEdit={setEditingTable}
              onDelete={setDeletingTable}
            />
          </div>
        )}
          </div>
        </div>
      </section>

      <CreateTableModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(table) => {
          setTables((current) => [
            ...current,
            {
              id: table.id,
              name: table.name,
              sort_order: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_viewed_at: null,
            },
          ]);
          router.push(`/credentials/${table.id}`);
          router.refresh();
        }}
      />

      {editingTable ? (
        <EditTableNameModal
          table={editingTable}
          isSaving={savingTableId === editingTable.id}
          onClose={() => {
            if (savingTableId) return;
            setEditingTable(null);
          }}
          onSave={(name) => handleRenameTable(editingTable, name)}
        />
      ) : null}

      {deletingTable ? (
        <DeleteTableConfirmModal
          table={deletingTable}
          isDeleting={deletingTableId === deletingTable.id}
          onClose={() => {
            if (deletingTableId) return;
            setDeletingTable(null);
          }}
          onConfirm={() => handleDeleteTable(deletingTable)}
        />
      ) : null}
    </div>
  );
}

function HeaderMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "blue";
}) {
  return (
    <div className="border-t border-slate-100 px-5 py-4 first:border-t-0 sm:border-s sm:border-t-0 sm:px-6 sm:first:border-s-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${
          tone === "blue" ? "text-blue-600" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
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

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8M16 7l3 3M14 9l2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11" />
    </svg>
  );
}

function TableGroup({
  title,
  items,
  deletingTableId,
  savingTableId,
  openMenuId,
  onOpenMenu,
  onEdit,
  onDelete,
}: {
  title: string;
  items: TableListItem[];
  deletingTableId: string | null;
  savingTableId: string | null;
  openMenuId: string | null;
  onOpenMenu: (id: string | null) => void;
  onEdit: (table: TableListItem) => void;
  onDelete: (table: TableListItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="px-4 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </div>
      <div className="space-y-2">
        {items.map((table) => (
          <TableRow
            key={table.id}
            table={table}
            isDeleting={deletingTableId === table.id}
            isSaving={savingTableId === table.id}
            menuOpen={openMenuId === table.id}
            onOpenMenu={onOpenMenu}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function TableRow({
  table,
  isDeleting,
  isSaving,
  menuOpen,
  onOpenMenu,
  onEdit,
  onDelete,
}: {
  table: TableListItem;
  isDeleting: boolean;
  isSaving: boolean;
  menuOpen: boolean;
  onOpenMenu: (id: string | null) => void;
  onEdit: (table: TableListItem) => void;
  onDelete: (table: TableListItem) => void;
}) {
  const iconColor = getTableIconColor(table.name);
  const isBusy = isDeleting || isSaving;

  return (
    <article className="group relative grid min-h-[68px] grid-cols-[minmax(300px,1fr)_110px_145px_145px_48px] items-center rounded-xl border border-slate-100 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.045)] transition hover:border-slate-200">
      <Link
        href={`/credentials/${table.id}`}
        className="col-span-4 grid min-w-0 grid-cols-[minmax(300px,1fr)_110px_145px_145px] items-center"
      >
        <div className="flex min-w-0 items-center gap-3 px-4 py-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm ${iconColor}`}
          >
            {table.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 transition group-hover:text-blue-700">
              {table.name}
            </p>
            <p className="mt-1 truncate text-xs text-slate-400">
              טבלת פרטי התחברות
            </p>
          </div>
        </div>

        <span className="px-3 py-3">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            {table.recordCount} רשומות
          </span>
        </span>
        <span className="px-3 py-3 text-sm tabular-nums text-slate-500">
          {formatTableDate(table.last_viewed_at)}
        </span>
        <span className="px-3 py-3 text-sm tabular-nums text-slate-400">
          {formatTableDate(table.updated_at)}
        </span>
      </Link>

      <div className="flex justify-center px-1 py-3">
        <TableRowActionsMenu
          disabled={isBusy}
          isDeleting={isDeleting}
          editLabel="ערוך שם טבלה"
          deleteLabel="מחק טבלה"
          open={menuOpen}
          onOpenChange={(open) => onOpenMenu(open ? table.id : null)}
          onEdit={() => onEdit(table)}
          onDelete={() => onDelete(table)}
        />
      </div>
    </article>
  );
}

function EditTableNameModal({
  table,
  isSaving,
  onClose,
  onSave,
}: {
  table: TableListItem;
  isSaving: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(table.name);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isSaving, onClose]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || isSaving) return;
    onSave(name.trim());
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
        aria-labelledby="edit-table-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h3 id="edit-table-title" className="text-lg font-semibold text-slate-900">
          עריכת שם טבלה
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          שנה את שם הטבלה — הרשומות יישארו ללא שינוי
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="edit-table-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              שם הטבלה
            </label>
            <input
              ref={inputRef}
              id="edit-table-name"
              type="text"
              value={name}
              required
              autoComplete="off"
              disabled={isSaving}
              onChange={(event) => setName(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
            >
              {isSaving ? "שומר..." : "שמור שם"}
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
        </form>
      </div>
    </div>
  );
}

function DeleteTableConfirmModal({
  table,
  isDeleting,
  onClose,
  onConfirm,
}: {
  table: TableListItem;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDeleting, onClose]);

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
        aria-labelledby="delete-table-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h3 id="delete-table-title" className="text-lg font-semibold text-slate-900">
          מחיקת טבלה
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          האם אתה בטוח שברצונך למחוק את הטבלה{" "}
          <span className="font-semibold text-slate-900">{table.name}</span> ואת
          כל המידע בתוכה?
        </p>
        {table.recordCount > 0 ? (
          <p className="mt-2 text-sm text-red-600">
            פעולה זו תמחק {table.recordCount} רשומות לצמיתות.
          </p>
        ) : null}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isDeleting ? "מוחק..." : "כן, מחק טבלה"}
          </button>
          <button
            type="button"
            disabled={isDeleting}
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
