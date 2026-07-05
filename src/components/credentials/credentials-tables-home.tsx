"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  deleteCredentialTable,
  updateCredentialTableName,
} from "@/app/credentials/actions";
import { CreateTableModal } from "@/components/credentials/create-table-modal";
import { PageHero } from "@/components/layout/page-hero";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
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
  const [tables, setTables] = useState(initialTables);
  const [credentials] = useState(initialCredentials);
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

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

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
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        title="פרטי התחברות"
        description="סיסמאות, גישות וחשבונות — מאורגנים בטבלאות לפי פלטפורמה"
        accent="slate"
        metrics={[
          { label: "טבלאות", value: String(tables.length) },
          { label: "רשומות", value: String(credentials.length) },
        ]}
      >
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
        >
          + טבלה חדשה
        </button>
      </PageHero>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">הטבלאות שלי</h2>
          <div className="relative w-full max-w-xs sm:w-72">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="חיפוש בטבלאות..."
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        {actionMessage ? (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
            {actionMessage}
          </div>
        ) : null}

        <div className="hidden grid-cols-[minmax(0,1fr)_80px_100px_100px_88px] gap-4 border-b border-slate-100 px-5 py-3 text-xs font-medium text-slate-500 sm:grid">
          <span>שם</span>
          <span>רשומות</span>
          <span>צפייה אחרונה</span>
          <span>עדכון אחרון</span>
          <span>פעולות</span>
        </div>

        {tableItems.length === 0 ? (
          <div className="px-5 py-16 text-center">
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
          <div className="divide-y divide-slate-100">
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
      </section>

      <CreateTableModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(table) => {
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
    <div>
      <div className="bg-slate-50 px-5 py-2 text-xs font-semibold text-slate-500">
        {title}
      </div>
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
    <div className="group relative grid grid-cols-[minmax(0,1fr)_88px] items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_80px_100px_100px_88px] sm:gap-4 sm:px-5">
      <Link
        href={`/credentials/${table.id}`}
        className="col-span-1 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:col-span-4 sm:grid-cols-[minmax(0,1fr)_80px_100px_100px] sm:gap-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${iconColor}`}
          >
            {table.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {table.name}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 sm:hidden">
              {table.recordCount} רשומות · צפייה{" "}
              {formatTableDate(table.last_viewed_at)}
            </p>
          </div>
        </div>

        <span className="hidden text-sm text-slate-600 sm:block">
          {table.recordCount}
        </span>
        <span className="hidden text-sm text-slate-500 sm:block">
          {formatTableDate(table.last_viewed_at)}
        </span>
        <span className="hidden text-sm text-slate-400 sm:block">
          {formatTableDate(table.updated_at)}
        </span>
      </Link>

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
