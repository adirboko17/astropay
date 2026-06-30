"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  createCredential,
  deleteCredential,
  updateCredential,
} from "@/app/credentials/actions";
import { ClientCardModal } from "@/components/credentials/client-card-modal";
import {
  ClientSelectorField,
  getClientNameForSave,
} from "@/components/credentials/client-selector-field";
import {
  credentialToFormData,
  EMPTY_CREDENTIAL,
  type CredentialFormData,
} from "@/lib/credentials/constants";
import {
  buildDraftFromClientCredentials,
  countCredentialsForClient,
  findClientById,
  sortClients,
} from "@/lib/credentials/clients";
import { getPlatformBadgeClass } from "@/lib/credentials/platform-ui";
import { getTableName } from "@/lib/credentials/tables";
import type {
  ClientCredential,
  CredentialClient,
  CredentialTable,
} from "@/types/database";

interface CredentialsManagerProps {
  table: CredentialTable;
  initialCredentials: ClientCredential[];
  initialTables: CredentialTable[];
  initialClients: CredentialClient[];
}

const columns = [
  { key: "client_name", label: "שם לקוח" },
  { key: "table", label: "טבלה" },
  { key: "login_email", label: "אימייל" },
  { key: "login_username", label: "משתמש" },
  { key: "password", label: "סיסמה" },
  { key: "website_url", label: "אתר" },
  { key: "notes", label: "הערות" },
  { key: "actions", label: "פעולות" },
] as const;

export function CredentialsManager({
  table,
  initialCredentials,
  initialTables,
  initialClients = [],
}: CredentialsManagerProps) {
  const router = useRouter();
  const [credentials, setCredentials] =
    useState<ClientCredential[]>(initialCredentials);
  const [tables, setTables] = useState<CredentialTable[]>(initialTables);
  const [clients, setClients] = useState<CredentialClient[]>(initialClients ?? []);
  const [draft, setDraft] = useState<CredentialFormData>(EMPTY_CREDENTIAL);
  const [draftClientId, setDraftClientId] = useState<string | null>(null);
  const [draftNewClientName, setDraftNewClientName] = useState("");
  const [draftPrefilledFromClient, setDraftPrefilledFromClient] = useState(false);
  const [editingCredential, setEditingCredential] =
    useState<ClientCredential | null>(null);
  const [editDraft, setEditDraft] = useState<CredentialFormData>(EMPTY_CREDENTIAL);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editNewClientName, setEditNewClientName] = useState("");
  const [cardClientId, setCardClientId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    setCredentials(initialCredentials);
    setTables(initialTables);
    setClients(initialClients ?? []);
  }, [initialCredentials, initialTables, initialClients]);

  const sortedClients = useMemo(() => sortClients(clients), [clients]);
  const cardClient = useMemo(
    () => findClientById(clients, cardClientId),
    [cardClientId, clients],
  );

  const activeTable = table;

  const visibleColumns = useMemo(
    () => columns.filter((column) => column.key !== "table"),
    [],
  );

  const tableCredentials = useMemo(() => {
    return [...credentials]
      .filter((credential) => credential.table_id === activeTable.id)
      .sort((a, b) => a.client_name.localeCompare(b.client_name, "he"));
  }, [activeTable.id, credentials]);

  const filteredCredentials = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return tableCredentials;

    return tableCredentials.filter(
      (credential) =>
        credential.client_name.toLowerCase().includes(needle) ||
        (credential.login_email?.toLowerCase().includes(needle) ?? false),
    );
  }, [searchQuery, tableCredentials]);

  function handleSelectTable(tableId: string) {
    router.push(`/credentials/${tableId}`);
  }

  function handleDraftChange(field: keyof CredentialFormData, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSelectDraftClient(clientId: string | null) {
    setDraftClientId(clientId);

    if (!clientId) {
      setDraft(EMPTY_CREDENTIAL);
      setDraftPrefilledFromClient(false);
      return;
    }

    const clientName = getClientNameForSave(clients, clientId, "");
    const clientCredentials = credentials.filter(
      (credential) => credential.client_id === clientId,
    );
    const prefilled = buildDraftFromClientCredentials(
      clientCredentials,
      clientName,
      activeTable?.id ?? null,
    );

    setDraft(prefilled);
    setDraftPrefilledFromClient(
      clientCredentials.some(
        (credential) => credential.table_id !== activeTable?.id,
      ),
    );
  }

  function handleEditDraftChange(field: keyof CredentialFormData, value: string) {
    setEditDraft((current) => ({ ...current, [field]: value }));
  }

  function openEditModal(row: ClientCredential) {
    setEditingCredential(row);
    setEditDraft(credentialToFormData(row));
    setEditClientId(row.client_id);
    setEditNewClientName(row.client_name);
    setCardClientId(null);
    setMessage(null);
    setError(null);
  }

  function openClientCard(clientId: string) {
    setCardClientId(clientId);
    setEditingCredential(null);
  }

  function closeEditModal() {
    if (isSavingEdit) return;
    setEditingCredential(null);
    setEditDraft(EMPTY_CREDENTIAL);
    setEditClientId(null);
    setEditNewClientName("");
  }

  function resetDraft() {
    setDraft(EMPTY_CREDENTIAL);
    setDraftClientId(null);
    setDraftNewClientName("");
    setDraftPrefilledFromClient(false);
  }

  function openAddModal() {
    resetDraft();
    setAddModalOpen(true);
    setMessage(null);
    setError(null);
  }

  function closeAddModal() {
    if (isCreating) return;
    resetDraft();
    setAddModalOpen(false);
  }

  async function handleCreate() {
    if (isCreating) return;

    const clientName = getClientNameForSave(
      clients,
      draftClientId,
      draftNewClientName,
    );

    if (!clientName) {
      setError("יש לבחור לקוח או להזין שם לקוח חדש");
      return;
    }

    setIsCreating(true);
    setMessage(null);
    setError(null);

    try {
      const result = await createCredential(
        { ...draft, client_name: clientName },
        activeTable.id,
        draftClientId,
      );
      if (result.error) {
        setError(result.error);
        return;
      }

      resetDraft();
      setAddModalOpen(false);
      router.refresh();
      setMessage("הרשומה נוספה וקושרה ללקוח");
    } catch {
      setError("שגיאה בלתי צפויה בהוספת הרשומה");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate() {
    if (!editingCredential || isSavingEdit) return;

    const clientName = getClientNameForSave(
      clients,
      editClientId,
      editNewClientName,
      { preferEditedName: true },
    );

    if (!clientName) {
      setError("יש לבחור לקוח או להזין שם לקוח");
      return;
    }

    setIsSavingEdit(true);
    setMessage(null);
    setError(null);

    try {
      const result = await updateCredential(
        editingCredential.id,
        { ...editDraft, client_name: clientName },
        editingCredential.table_id,
        editClientId,
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setCredentials((current) =>
        current.map((row) => {
          const linkedClientId = result.clientId ?? editClientId;

          if (row.id === editingCredential.id) {
            return {
              ...row,
              client_id: linkedClientId,
              client_name: clientName,
              login_email: editDraft.login_email.trim() || null,
              login_username: editDraft.login_username.trim() || null,
              password: editDraft.password || null,
              website_url: editDraft.website_url.trim() || null,
              notes: editDraft.notes.trim() || null,
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
          client.id === (result.clientId ?? editClientId)
            ? { ...client, name: clientName }
            : client,
        ),
      );
      setMessage(`"${clientName}" עודכן בהצלחה`);
      setEditingCredential(null);
      setEditDraft(EMPTY_CREDENTIAL);
      setEditClientId(null);
      setEditNewClientName("");
      router.refresh();
    } catch {
      setError("שגיאה בלתי צפויה בעדכון הרשומה");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete(id: string, clientName: string) {
    if (!window.confirm(`למחוק את "${clientName}"?`) || deletingId) return;

    setDeletingId(id);
    setMessage(null);
    setError(null);

    try {
      const result = await deleteCredential(id);
      if (result.error) {
        setError(result.error);
        return;
      }

      setCredentials((current) => current.filter((row) => row.id !== id));
      if (editingCredential?.id === id) {
        setEditingCredential(null);
        setEditDraft(EMPTY_CREDENTIAL);
      }
      setMessage(`"${clientName}" נמחק`);
      router.refresh();
    } catch {
      setError("שגיאה בלתי צפויה במחיקת הרשומה");
    } finally {
      setDeletingId(null);
    }
  }

  const isBusy = isCreating || isSavingEdit || deletingId !== null;

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

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <Link
              href="/credentials"
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              ← חזור לכל הטבלאות
            </Link>
            <h2 className="mt-2 hidden text-base font-semibold text-slate-900 lg:block">
              {activeTable.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery.trim()
                ? `${filteredCredentials.length} מתוך ${tableCredentials.length} רשומות`
                : `${tableCredentials.length} רשומות`}
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="h-11 w-full shrink-0 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:h-10 sm:w-auto"
          >
            + הוסף לטבלה
          </button>
        </div>

        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="relative w-full max-w-md">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="חיפוש לפי שם או אימייל..."
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
          <div className="px-4 py-16 text-center sm:px-5">
            <div className="mx-auto max-w-sm">
              <p className="text-sm font-medium text-slate-600">
                {searchQuery.trim()
                  ? "לא נמצאו תוצאות לחיפוש"
                  : `אין רשומות ב-${activeTable.name} עדיין`}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {searchQuery.trim()
                  ? "נסה שם או אימייל אחר"
                  : "לחץ על + הוסף לטבלה כדי להוסיף רשומה ראשונה"}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredCredentials.map((row) => (
                <CredentialMobileCard
                  key={row.id}
                  row={row}
                  linkedRecordsCount={countCredentialsForClient(
                    credentials,
                    row.client_id,
                  )}
                  disabled={isBusy}
                  isDeleting={deletingId === row.id}
                  onOpenClientCard={
                    row.client_id
                      ? () => openClientCard(row.client_id!)
                      : undefined
                  }
                  onEdit={() => openEditModal(row)}
                  onDelete={() => handleDelete(row.id, row.client_name)}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr>
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-3 text-start text-xs font-semibold tracking-wide text-slate-500 backdrop-blur"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCredentials.map((row, index) => (
                <CredentialRow
                  key={row.id}
                  row={row}
                  tableName={getTableName(row.table_id, tables) ?? row.platform}
                  linkedRecordsCount={countCredentialsForClient(
                    credentials,
                    row.client_id,
                  )}
                  striped={index % 2 === 1}
                  showTableColumn={false}
                  disabled={isBusy}
                  isDeleting={deletingId === row.id}
                  onOpenClientCard={
                    row.client_id
                      ? () => openClientCard(row.client_id!)
                      : undefined
                  }
                  onEdit={() => openEditModal(row)}
                  onDelete={() => handleDelete(row.id, row.client_name)}
                />
              ))}
            </tbody>
          </table>
        </div>
          </>
        )}
      </section>

      {addModalOpen ? (
        <AddCredentialModal
          tableName={activeTable.name}
          clients={sortedClients}
          selectedClientId={draftClientId}
          newClientName={draftNewClientName}
          draft={draft}
          isCreating={isCreating}
          prefilledFromClient={draftPrefilledFromClient}
          onSelectClient={handleSelectDraftClient}
          onNewClientNameChange={setDraftNewClientName}
          onChange={handleDraftChange}
          onClose={closeAddModal}
          onSave={handleCreate}
        />
      ) : null}

      {editingCredential ? (
        <EditCredentialModal
          tableName={
            getTableName(editingCredential.table_id, tables) ??
            editingCredential.platform
          }
          clients={sortedClients}
          selectedClientId={editClientId}
          newClientName={editNewClientName}
          draft={editDraft}
          isSaving={isSavingEdit}
          onSelectClient={(clientId) => {
            setEditClientId(clientId);
            if (clientId) {
              const selected = sortedClients.find(
                (client) => client.id === clientId,
              );
              setEditNewClientName(selected?.name ?? "");
            } else {
              setEditNewClientName("");
            }
          }}
          onNewClientNameChange={setEditNewClientName}
          onChange={handleEditDraftChange}
          onClose={closeEditModal}
          onSave={handleUpdate}
        />
      ) : null}

      {cardClient ? (
        <ClientCardModal
          client={cardClient}
          credentials={credentials}
          tables={tables}
          onClose={() => setCardClientId(null)}
          onEdit={(credential) => openEditModal(credential)}
          onGoToTable={(tableId) => {
            setCardClientId(null);
            handleSelectTable(tableId);
          }}
          onClientRenamed={(clientId, name) => {
            setClients((current) =>
              current.map((client) =>
                client.id === clientId ? { ...client, name } : client,
              ),
            );
            setCredentials((current) =>
              current.map((row) =>
                row.client_id === clientId ? { ...row, client_name: name } : row,
              ),
            );
            router.refresh();
          }}
        />
      ) : null}

      <p className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-xs text-slate-400 shadow-sm">
        הנתונים נשמרים ב-Supabase. גישה לטבלה זו רק דרך השרת — לא נחשף לדפדפן
        ישירות.
      </p>
    </div>
  );
}

function LockedTableField({ name }: { name: string }) {
  return (
    <div className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-500">טבלה</span>
      <div
        className={`flex h-11 items-center rounded-xl px-3 text-sm font-medium ${getPlatformBadgeClass(name)}`}
      >
        {name}
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

function AddCredentialModal({
  tableName,
  clients,
  selectedClientId,
  newClientName,
  draft,
  isCreating,
  prefilledFromClient,
  onSelectClient,
  onNewClientNameChange,
  onChange,
  onClose,
  onSave,
}: {
  tableName: string;
  clients: CredentialClient[];
  selectedClientId: string | null;
  newClientName: string;
  draft: CredentialFormData;
  isCreating: boolean;
  prefilledFromClient: boolean;
  onSelectClient: (clientId: string | null) => void;
  onNewClientNameChange: (name: string) => void;
  onChange: (field: keyof CredentialFormData, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isCreating) onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isCreating, onClose]);

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
        aria-labelledby="add-credential-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h3 id="add-credential-title" className="text-lg font-semibold text-slate-900">
          הוספה לטבלת {tableName}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          בחר לקוח קיים או צור חדש — ניתן לערוך את כל השדות לפני השמירה
        </p>

        <div className="mt-5 space-y-4">
          <ClientSelectorField
            clients={clients}
            selectedClientId={selectedClientId}
            newClientName={newClientName}
            disabled={isCreating}
            onSelectClient={onSelectClient}
            onNewClientNameChange={onNewClientNameChange}
          />

          {prefilledFromClient && selectedClientId ? (
            <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              הפרטים נמשכו מרשומות קיימות של הלקוח — ניתן לערוך לפני השמירה
              לטבלת {tableName}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <LockedTableField name={tableName} />
            <Field
              label="אימייל"
              value={draft.login_email}
              disabled={isCreating}
              placeholder="email@example.com"
              onChange={(value) => onChange("login_email", value)}
            />
            <Field
              label="משתמש"
              value={draft.login_username}
              disabled={isCreating}
              placeholder="username"
              onChange={(value) => onChange("login_username", value)}
            />
            <Field
              label="סיסמה"
              value={draft.password}
              disabled={isCreating}
              type="password"
              placeholder="••••••"
              onChange={(value) => onChange("password", value)}
            />
            <Field
              label="אתר"
              value={draft.website_url}
              disabled={isCreating}
              placeholder="https://..."
              onChange={(value) => onChange("website_url", value)}
            />
            <div className="sm:col-span-2">
              <Field
                label="הערות"
                value={draft.notes}
                disabled={isCreating}
                placeholder="הערות נוספות..."
                onChange={(value) => onChange("notes", value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={isCreating}
            onClick={onSave}
            className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isCreating ? "שומר..." : "+ הוסף רשומה"}
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
      </div>
    </div>
  );
}

function EditCredentialModal({
  tableName,
  clients,
  selectedClientId,
  newClientName,
  draft,
  isSaving,
  onSelectClient,
  onNewClientNameChange,
  onChange,
  onClose,
  onSave,
}: {
  tableName: string;
  clients: CredentialClient[];
  selectedClientId: string | null;
  newClientName: string;
  draft: CredentialFormData;
  isSaving: boolean;
  onSelectClient: (clientId: string | null) => void;
  onNewClientNameChange: (name: string) => void;
  onChange: (field: keyof CredentialFormData, value: string) => void;
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
        aria-labelledby="edit-credential-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h3 id="edit-credential-title" className="text-lg font-semibold text-slate-900">
          עריכת רשומה
        </h3>
        <p className="mt-1 text-sm text-slate-500">טבלה: {tableName}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ClientSelectorField
              clients={clients}
              selectedClientId={selectedClientId}
              newClientName={newClientName}
              disabled={isSaving}
              allowRenameWhenSelected
              onSelectClient={onSelectClient}
              onNewClientNameChange={onNewClientNameChange}
            />
          </div>
          <LockedTableField name={tableName} />
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
            disabled={isSaving}
            onClick={onSave}
            className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isSaving ? "שומר..." : "שמור שינויים"}
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

function CredentialMobileCard({
  row,
  linkedRecordsCount,
  disabled,
  isDeleting,
  onOpenClientCard,
  onEdit,
  onDelete,
}: {
  row: ClientCredential;
  linkedRecordsCount: number;
  disabled: boolean;
  isDeleting: boolean;
  onOpenClientCard?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const website = row.website_url?.trim() ?? "";
  const isLink =
    website.startsWith("http://") || website.startsWith("https://");

  return (
    <article className="space-y-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {onOpenClientCard ? (
            <button
              type="button"
              onClick={onOpenClientCard}
              className="truncate text-base font-semibold text-blue-700 transition hover:text-blue-900 hover:underline"
            >
              {row.client_name}
            </button>
          ) : (
            <h3 className="truncate text-base font-semibold text-slate-900">
              {row.client_name}
            </h3>
          )}
          {linkedRecordsCount > 1 ? (
            <span className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              {linkedRecordsCount} רשומות
            </span>
          ) : null}
        </div>

        <RowActionsMenu
          disabled={disabled}
          isDeleting={isDeleting}
          onOpenClientCard={onOpenClientCard}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      <dl className="grid grid-cols-1 gap-2 text-sm">
        <MobileDetail label="אימייל" value={row.login_email || "—"} />
        <MobileDetail label="משתמש" value={row.login_username || "—"} />
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-medium text-slate-400">סיסמה</dt>
          <dd className="mt-1">
            <PasswordDisplay value={row.password ?? ""} />
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-medium text-slate-400">אתר</dt>
          <dd className="mt-0.5 truncate">
            {website ? (
              isLink ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {website}
                </a>
              ) : (
                <span className="text-slate-700">{website}</span>
              )
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </dd>
        </div>
        {row.notes ? (
          <MobileDetail label="הערות" value={row.notes} />
        ) : null}
      </dl>
    </article>
  );
}

function MobileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-slate-700">{value}</dd>
    </div>
  );
}

function CredentialRow({
  row,
  tableName,
  linkedRecordsCount,
  striped,
  showTableColumn,
  disabled,
  isDeleting,
  onOpenClientCard,
  onEdit,
  onDelete,
}: {
  row: ClientCredential;
  tableName: string;
  linkedRecordsCount: number;
  striped: boolean;
  showTableColumn: boolean;
  disabled: boolean;
  isDeleting: boolean;
  onOpenClientCard?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const website = row.website_url?.trim() ?? "";
  const isLink =
    website.startsWith("http://") || website.startsWith("https://");

  return (
    <tr
      className={`group transition hover:bg-blue-50/40 ${
        striped ? "bg-slate-50/50" : "bg-white"
      }`}
    >
      <DisplayCell emphasized>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenClientCard ? (
            <button
              type="button"
              onClick={onOpenClientCard}
              className="font-medium text-blue-700 transition hover:text-blue-900 hover:underline"
            >
              {row.client_name}
            </button>
          ) : (
            <span>{row.client_name}</span>
          )}
          {linkedRecordsCount > 1 ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              {linkedRecordsCount} רשומות
            </span>
          ) : null}
        </div>
      </DisplayCell>
      {showTableColumn ? (
        <td className="border-b border-slate-100 px-4 py-3">
          <span
            className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${getPlatformBadgeClass(tableName)}`}
          >
            {tableName || "—"}
          </span>
        </td>
      ) : null}
      <DisplayCell>{row.login_email || "—"}</DisplayCell>
      <DisplayCell>{row.login_username || "—"}</DisplayCell>
      <td className="border-b border-slate-100 px-4 py-3">
        <PasswordDisplay value={row.password ?? ""} />
      </td>
      <td className="border-b border-slate-100 px-4 py-3">
        {website ? (
          isLink ? (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {website}
            </a>
          ) : (
            <span className="text-sm text-slate-700">{website}</span>
          )
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>
      <DisplayCell muted>{row.notes || "—"}</DisplayCell>
      <td className="border-b border-slate-100 px-4 py-3">
        <RowActionsMenu
          disabled={disabled}
          isDeleting={isDeleting}
          onOpenClientCard={onOpenClientCard}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

function RowActionsMenu({
  disabled,
  isDeleting,
  onOpenClientCard,
  onEdit,
  onDelete,
}: {
  disabled: boolean;
  isDeleting: boolean;
  onOpenClientCard?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <div className="relative flex justify-center">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-label="פעולות"
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
      >
        <span>פעולות</span>
        <span className="text-base leading-none text-slate-400" aria-hidden="true">
          ⋮
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="סגור תפריט"
            className="fixed inset-0 z-10"
            onClick={close}
          />
          <div
            role="menu"
            className="absolute end-0 top-full z-20 mt-1 min-w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {onOpenClientCard ? (
              <button
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={() => {
                  close();
                  onOpenClientCard();
                }}
                className="flex w-full px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                כרטיס לקוח
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => {
                close();
                onEdit();
              }}
              className="flex w-full px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              ערוך
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={disabled || isDeleting}
              onClick={() => {
                close();
                onDelete();
              }}
              className="flex w-full px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? "מוחק..." : "מחק"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function DisplayCell({
  children,
  emphasized,
  muted,
}: {
  children: React.ReactNode;
  emphasized?: boolean;
  muted?: boolean;
}) {
  return (
    <td className="border-b border-slate-100 px-4 py-3">
      <span
        className={`text-sm ${
          emphasized
            ? "font-medium text-slate-900"
            : muted
              ? "text-slate-500"
              : "text-slate-700"
        }`}
      >
        {children}
      </span>
    </td>
  );
}

function PasswordDisplay({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);

  if (!value) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm text-slate-700">
        {visible ? value : "••••••"}
      </span>
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        {visible ? "הסתר" : "הצג"}
      </button>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value)}
        className="rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        העתק
      </button>
    </div>
  );
}
