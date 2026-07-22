"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  createCredential,
  deleteCredential,
  updateCredential,
} from "@/app/credentials/actions";
import {
  ClientSelectorField,
  getClientNameForSave,
} from "@/components/credentials/client-selector-field";
import { TableRowActionsMenu, UserCardIcon } from "@/components/ui/table-row-actions-menu";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { EMPTY_CREDENTIAL } from "@/lib/credentials/constants";
import { sortClients } from "@/lib/credentials/clients";
import {
  countEnvVariables,
} from "@/lib/credentials/env-table";
import type {
  ClientCredential,
  CredentialClient,
  CredentialTable,
} from "@/types/database";

interface EnvCredentialsManagerProps {
  table: CredentialTable;
  initialCredentials: ClientCredential[];
  initialClients: CredentialClient[];
}

export function EnvCredentialsManager({
  table,
  initialCredentials,
  initialClients = [],
}: EnvCredentialsManagerProps) {
  const router = useRouter();
  const [credentials, setCredentials] = useSyncedState(initialCredentials);
  const [clients, setClients] = useSyncedState(initialClients);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCredential, setEditingCredential] =
    useState<ClientCredential | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [envContent, setEnvContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const sortedClients = useMemo(() => sortClients(clients), [clients]);

  const tableCredentials = useMemo(() => {
    return [...credentials]
      .filter((credential) => credential.table_id === table.id)
      .sort((a, b) => a.client_name.localeCompare(b.client_name, "he"));
  }, [credentials, table.id]);

  const filteredCredentials = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return tableCredentials;

    return tableCredentials.filter((credential) => {
      const haystack = `${credential.client_name} ${credential.notes ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [searchQuery, tableCredentials]);

  function resetModal() {
    setEditingCredential(null);
    setClientId(null);
    setNewClientName("");
    setEnvContent("");
  }

  function openAddModal() {
    resetModal();
    setModalOpen(true);
    setMessage(null);
    setError(null);
  }

  function openEditModal(row: ClientCredential) {
    setEditingCredential(row);
    setClientId(row.client_id);
    setNewClientName(row.client_name);
    setEnvContent(row.notes ?? "");
    setModalOpen(true);
    setMessage(null);
    setError(null);
  }

  function closeModal() {
    if (isSaving) return;
    setModalOpen(false);
    resetModal();
  }

  async function handleSave() {
    if (isSaving) return;

    const clientName = getClientNameForSave(clients, clientId, newClientName);

    if (!clientName) {
      setError("יש לבחור פרויקט או להזין שם פרויקט חדש");
      return;
    }

    if (!envContent.trim()) {
      setError("יש להדביק תוכן ENV");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      ...EMPTY_CREDENTIAL,
      client_name: clientName,
      notes: envContent,
    };

    try {
      if (editingCredential) {
        const result = await updateCredential(
          editingCredential.id,
          payload,
          table.id,
          clientId,
        );

        if (result.error) {
          setError(result.error);
          return;
        }

        setCredentials((current) =>
          current.map((row) => {
            const linkedClientId = result.clientId ?? clientId;

            if (row.id === editingCredential.id) {
              return {
                ...row,
                client_id: linkedClientId,
                client_name: clientName,
                notes: envContent,
              };
            }

            if (linkedClientId && row.client_id === linkedClientId) {
              return { ...row, client_name: clientName };
            }

            return row;
          }),
        );
        setClients((current) =>
          current.map((client) =>
            client.id === (result.clientId ?? clientId)
              ? { ...client, name: clientName }
              : client,
          ),
        );
        setMessage(`ENV של "${clientName}" עודכן בהצלחה`);
      } else {
        const result = await createCredential(payload, table.id, clientId);

        if (result.error) {
          setError(result.error);
          return;
        }

        if ("credential" in result && result.credential) {
          setCredentials((current) => [...current, result.credential]);
        }

        if (result.clientId && !clients.some((client) => client.id === result.clientId)) {
          setClients((current) => [
            ...current,
            {
              id: result.clientId!,
              name: clientName,
              notes: null,
              email: null,
              phone: null,
              company: null,
              status: "active",
              total_amount_due: 0,
              currency: "ILS",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }

        setMessage(`ENV של "${clientName}" נשמר בהצלחה`);
      }

      setModalOpen(false);
      resetModal();
      router.refresh();
    } catch {
      setError("שגיאה בלתי צפויה בשמירת ENV");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(row: ClientCredential) {
    if (!window.confirm(`למחוק את ENV של "${row.client_name}"?`) || deletingId) {
      return;
    }

    setDeletingId(row.id);
    setMessage(null);
    setError(null);

    try {
      const result = await deleteCredential(row.id);
      if (result.error) {
        setError(result.error);
        return;
      }

      setCredentials((current) => current.filter((item) => item.id !== row.id));
      if (editingCredential?.id === row.id) {
        closeModal();
      }
      setMessage(`ENV של "${row.client_name}" נמחק`);
      router.refresh();
    } catch {
      setError("שגיאה בלתי צפויה במחיקת ENV");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCopy(row: ClientCredential) {
    const content = row.notes ?? "";
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(row.id);
      setMessage(`ENV של "${row.client_name}" הועתק`);
      window.setTimeout(() => {
        setCopiedId((current) => (current === row.id ? null : current));
      }, 2000);
    } catch {
      setError("לא ניתן להעתיק — נסה שוב");
    }
  }

  const isBusy = isSaving || deletingId !== null;
  const totalEnvVariables = tableCredentials.reduce(
    (sum, row) => sum + countEnvVariables(row.notes),
    0,
  );

  return (
    <div className="space-y-5">
      {(message || error) && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
            error
              ? "border border-red-200/80 bg-red-50 text-red-700"
              : "border border-emerald-200/80 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <EnvIcon />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">
                Environment
              </p>
              <h1 className="mt-0.5 text-xl font-bold text-slate-950 sm:text-2xl">ENV</h1>
              <p className="mt-1 text-sm text-slate-500">
                שמירת משתני סביבה לכל פרויקט במקום אחד
              </p>
            </div>
          </div>
        </div>

        <div className="grid border-t border-slate-100 sm:grid-cols-3">
          <HeaderMetric label="פרויקטים" value={String(tableCredentials.length)} />
          <HeaderMetric label="משתנים שמורים" value={String(totalEnvVariables)} tone="success" />
          <HeaderMetric
            label="ממוצע לפרויקט"
            value={
              tableCredentials.length > 0
                ? String(Math.round(totalEnvVariables / tableCredentials.length))
                : "0"
            }
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="relative z-20 border-b border-slate-100 p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CodeIcon />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">קבצי ENV לפי פרויקט</h2>
                <p className="text-xs text-slate-400">
                  מציג {filteredCredentials.length} מתוך {tableCredentials.length} פרויקטים
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
                  placeholder="חיפוש לפי שם פרויקט או משתנה..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pe-10 ps-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute end-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    aria-label="נקה חיפוש"
                  >
                    <ClearIcon />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <PlusIcon />
                הוסף ENV
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto p-2">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[minmax(300px,1fr)_150px_150px_190px_48px] items-center px-4 py-2.5 text-[11px] font-semibold text-slate-500">
              <span>פרויקט</span>
              <span>משתנים</span>
              <span>סטטוס</span>
              <span>העתקה</span>
              <span />
            </div>

            {filteredCredentials.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-600">
                  {searchQuery.trim() ? "לא נמצאו תוצאות לחיפוש" : "אין ENV שמורים עדיין"}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {searchQuery.trim()
                    ? "נסה שם פרויקט או משתנה אחר"
                    : "הוסף ENV כדי להדביק קובץ של פרויקט"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCredentials.map((row) => {
                  const variableCount = countEnvVariables(row.notes);
                  const copied = copiedId === row.id;

                  return (
                    <article
                      key={row.id}
                      className="grid min-h-[68px] grid-cols-[minmax(300px,1fr)_150px_150px_190px_48px] items-center rounded-xl border border-slate-100 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.045)] transition hover:border-slate-200"
                    >
                      <div className="flex min-w-0 items-center gap-3 px-4 py-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-mono text-xs font-bold text-emerald-700">
                          .env
                        </span>
                        <div className="min-w-0">
                        {row.client_id ? (
                          <Link
                            href={`/customers/${row.client_id}`}
                              className="block truncate text-sm font-bold text-slate-900 transition hover:text-emerald-700"
                          >
                            {row.client_name}
                          </Link>
                        ) : (
                            <span className="block truncate text-sm font-bold text-slate-900">
                            {row.client_name}
                          </span>
                        )}
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {row.client_id ? "מקושר לכרטיס לקוח" : "ללא קישור ללקוח"}
                          </p>
                        </div>
                      </div>
                      <div className="px-3 py-3">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                          {variableCount} משתנים
                        </span>
                      </div>
                      <div className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${
                            row.notes
                              ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {row.notes ? "ENV שמור" : "אין תוכן"}
                        </span>
                      </div>
                      <div className="px-3 py-3">
                      <button
                        type="button"
                        disabled={!row.notes || isBusy}
                        onClick={() => handleCopy(row)}
                          className={`inline-flex h-9 min-w-28 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition disabled:opacity-50 ${
                          copied
                            ? "bg-emerald-100 text-emerald-800"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                          <CopyIcon />
                        {copied ? "הועתק!" : "העתק ENV"}
                      </button>
                      </div>
                      <div className="flex justify-center px-1 py-3">
                      <TableRowActionsMenu
                        disabled={isBusy}
                        isDeleting={deletingId === row.id}
                        extraItems={
                          row.client_id
                            ? [
                                {
                                  label: "כרטיס לקוח",
                                  onClick: () => router.push(`/customers/${row.client_id}`),
                                  icon: <UserCardIcon />,
                                  disabled: isBusy,
                                },
                              ]
                            : []
                        }
                        onEdit={() => openEditModal(row)}
                        onDelete={() => handleDelete(row)}
                      />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {modalOpen ? (
        <EnvEditorModal
          mode={editingCredential ? "edit" : "add"}
          clients={sortedClients}
          selectedClientId={clientId}
          newClientName={newClientName}
          envContent={envContent}
          isSaving={isSaving}
          onSelectClient={(nextClientId) => {
            setClientId(nextClientId);
            if (nextClientId) {
              const selected = sortedClients.find((client) => client.id === nextClientId);
              setNewClientName(selected?.name ?? "");
            } else {
              setNewClientName("");
            }
          }}
          onNewClientNameChange={setNewClientName}
          onEnvContentChange={setEnvContent}
          onClose={closeModal}
          onSave={handleSave}
        />
      ) : null}

      <p className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-xs text-slate-400 shadow-sm">
        תוכן ה-ENV נשמר כמו שהוא — כולל שורות, רווחים וסימני =. הנתונים נשמרים ב-Supabase
        ונגישים רק דרך השרת.
      </p>
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
  tone?: "default" | "success";
}) {
  return (
    <div className="border-t border-slate-100 px-5 py-4 first:border-t-0 sm:border-s sm:border-t-0 sm:px-6 sm:first:border-s-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${
          tone === "success" ? "text-emerald-600" : "text-slate-950"
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

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function EnvIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 2 2-2 2M12 14h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EnvEditorModal({
  mode,
  clients,
  selectedClientId,
  newClientName,
  envContent,
  isSaving,
  onSelectClient,
  onNewClientNameChange,
  onEnvContentChange,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  clients: CredentialClient[];
  selectedClientId: string | null;
  newClientName: string;
  envContent: string;
  isSaving: boolean;
  onSelectClient: (clientId: string | null) => void;
  onNewClientNameChange: (name: string) => void;
  onEnvContentChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
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
        aria-labelledby="env-editor-title"
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 id="env-editor-title" className="text-lg font-semibold text-slate-900">
            {mode === "add" ? "הוספת ENV לפרויקט" : "עריכת ENV"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            הדבק את כל תוכן קובץ ה-.env — כולל הערות ושורות ריקות
          </p>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <ClientSelectorField
            clients={clients}
            selectedClientId={selectedClientId}
            newClientName={newClientName}
            disabled={isSaving}
            allowRenameWhenSelected={mode === "edit"}
            onSelectClient={onSelectClient}
            onNewClientNameChange={onNewClientNameChange}
          />

          <label className="block space-y-2">
            <span className="text-xs font-medium text-slate-500">תוכן ENV</span>
            <textarea
              value={envContent}
              disabled={isSaving}
              onChange={(event) => onEnvContentChange(event.target.value)}
              rows={16}
              dir="ltr"
              spellCheck={false}
              placeholder={"NEXT_PUBLIC_API_URL=https://example.com\nDATABASE_URL=postgresql://...\nAPI_SECRET=..."}
              className="min-h-[280px] w-full resize-y rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-[13px] leading-relaxed text-emerald-200 outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:opacity-50"
            />
          </label>

          <p className="text-xs text-slate-400">
            {countEnvVariables(envContent)} משתנים · {envContent.length} תווים
          </p>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isSaving ? "שומר..." : mode === "add" ? "שמור ENV" : "שמור שינויים"}
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
