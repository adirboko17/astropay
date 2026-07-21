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
import { PageHero } from "@/components/layout/page-hero";
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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

      <PageHero
        title="ENV"
        description="שמירת קובץ .env לכל פרויקט — הדבקה, עריכה והעתקה מלאה"
        accent="emerald"
        metrics={[
          { label: "פרויקטים", value: String(tableCredentials.length) },
          {
            label: "משתנים (סה״כ)",
            value: String(
              tableCredentials.reduce(
                (sum, row) => sum + countEnvVariables(row.notes),
                0,
              ),
            ),
          },
        ]}
      >
        <button
          type="button"
          onClick={openAddModal}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
        >
          + הוסף ENV
        </button>
      </PageHero>

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">קבצי ENV לפי פרויקט</h2>
          <button
            type="button"
            onClick={openAddModal}
            className="h-10 shrink-0 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 lg:hidden"
          >
            + הוסף ENV
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-3">
          <div className="relative max-w-md">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="חיפוש לפי שם פרויקט או משתנה..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pe-10 ps-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 end-2 flex items-center rounded-md px-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="נקה חיפוש"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>

        {filteredCredentials.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium text-slate-600">
              {searchQuery.trim()
                ? "לא נמצאו תוצאות לחיפוש"
                : "אין ENV שמורים עדיין"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {searchQuery.trim()
                ? "נסה שם פרויקט או משתנה אחר"
                : "לחץ על + הוסף ENV כדי להדביק קובץ .env של פרויקט"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredCredentials.map((row) => {
              const variableCount = countEnvVariables(row.notes);
              const copied = copiedId === row.id;

              return (
                <li
                  key={row.id}
                  className="group px-5 py-3.5 transition hover:bg-slate-50/80"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {row.client_id ? (
                          <Link
                            href={`/customers/${row.client_id}`}
                            className="text-base font-semibold text-blue-700 transition hover:text-blue-900 hover:underline"
                          >
                            {row.client_name}
                          </Link>
                        ) : (
                          <span className="text-base font-semibold text-slate-900">
                            {row.client_name}
                          </span>
                        )}
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-100">
                          {variableCount} משתנים
                        </span>
                        {row.notes ? (
                          <span className="text-xs text-slate-400">ENV שמור</span>
                        ) : (
                          <span className="text-xs text-slate-400">אין תוכן</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={!row.notes || isBusy}
                        onClick={() => handleCopy(row)}
                        className={`h-9 rounded-xl px-3 text-xs font-semibold transition disabled:opacity-50 ${
                          copied
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}
                      >
                        {copied ? "הועתק!" : "העתק ENV"}
                      </button>
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
                  </div>
                </li>
              );
            })}
          </ul>
        )}
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
