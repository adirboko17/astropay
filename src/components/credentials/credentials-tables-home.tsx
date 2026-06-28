"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { deleteCredentialTable } from "@/app/credentials/actions";
import { CreateTableModal } from "@/components/credentials/create-table-modal";
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
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    if (!window.confirm(`למחוק את הטבלה "${table.name}"?`)) return;

    setDeletingTableId(table.id);
    setDeleteMessage(null);
    setOpenMenuId(null);

    try {
      const result = await deleteCredentialTable(table.id);

      if (result.error) {
        setDeleteMessage(result.error);
        return;
      }

      setTables((current) => current.filter((item) => item.id !== table.id));
      router.refresh();
    } catch {
      setDeleteMessage("שגיאה בלתי צפויה במחיקת הטבלה");
    } finally {
      setDeletingTableId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <section className="mb-8">
        <h2 className="text-sm font-medium text-slate-600">התחלה מהירה</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="group flex w-40 flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_1px_3px_rgba(60,64,67,.3)] ring-1 ring-slate-100 transition group-hover:shadow-md">
              <span className="text-3xl font-light text-slate-500">+</span>
            </span>
            <span className="mt-3 text-sm font-medium text-slate-700">
              טבלה חדשה
            </span>
          </button>
        </div>
      </section>

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

        {deleteMessage ? (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
            {deleteMessage}
          </div>
        ) : null}

        <div className="hidden grid-cols-[minmax(0,1fr)_80px_100px_100px_48px] gap-4 border-b border-slate-100 px-5 py-3 text-xs font-medium text-slate-500 sm:grid">
          <span>שם</span>
          <span>רשומות</span>
          <span>צפייה אחרונה</span>
          <span>עדכון אחרון</span>
          <span />
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
              openMenuId={openMenuId}
              onOpenMenu={setOpenMenuId}
              onDelete={handleDeleteTable}
            />
            <TableGroup
              title="7 הימים האחרונים"
              items={groupedTables.lastWeek}
              deletingTableId={deletingTableId}
              openMenuId={openMenuId}
              onOpenMenu={setOpenMenuId}
              onDelete={handleDeleteTable}
            />
            <TableGroup
              title="מוקדם יותר"
              items={groupedTables.older}
              deletingTableId={deletingTableId}
              openMenuId={openMenuId}
              onOpenMenu={setOpenMenuId}
              onDelete={handleDeleteTable}
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
    </div>
  );
}

function TableGroup({
  title,
  items,
  deletingTableId,
  openMenuId,
  onOpenMenu,
  onDelete,
}: {
  title: string;
  items: TableListItem[];
  deletingTableId: string | null;
  openMenuId: string | null;
  onOpenMenu: (id: string | null) => void;
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
          menuOpen={openMenuId === table.id}
          onOpenMenu={onOpenMenu}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function TableRow({
  table,
  isDeleting,
  menuOpen,
  onOpenMenu,
  onDelete,
}: {
  table: TableListItem;
  isDeleting: boolean;
  menuOpen: boolean;
  onOpenMenu: (id: string | null) => void;
  onDelete: (table: TableListItem) => void;
}) {
  const iconColor = getTableIconColor(table.name);

  return (
    <div className="group relative grid grid-cols-[minmax(0,1fr)_48px] items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_80px_100px_100px_48px] sm:gap-4 sm:px-5">
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

      <button
        type="button"
        onClick={() => onOpenMenu(menuOpen ? null : table.id)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 opacity-0 transition hover:bg-slate-200 group-hover:opacity-100"
        aria-label="אפשרויות"
      >
        ⋮
      </button>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="סגור תפריט"
            className="fixed inset-0 z-10"
            onClick={() => onOpenMenu(null)}
          />
          <div className="absolute end-8 top-10 z-20 min-w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => onDelete(table)}
              className="flex w-full px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? "מוחק..." : "מחק טבלה"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
