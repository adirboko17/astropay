"use client";

import { useEffect, useMemo, useState } from "react";

import { updateCredentialClientName } from "@/app/credentials/actions";
import { getPlatformBadgeClass } from "@/lib/credentials/platform-ui";
import { getTableName } from "@/lib/credentials/tables";
import type {
  ClientCredential,
  CredentialClient,
  CredentialTable,
} from "@/types/database";

interface ClientCardModalProps {
  client: CredentialClient;
  credentials: ClientCredential[];
  tables: CredentialTable[];
  onClose: () => void;
  onEdit: (credential: ClientCredential) => void;
  onGoToTable: (tableId: string) => void;
  onClientRenamed: (clientId: string, name: string) => void;
}

export function ClientCardModal({
  client,
  credentials,
  tables,
  onClose,
  onEdit,
  onGoToTable,
  onClientRenamed,
}: ClientCardModalProps) {
  const [clientName, setClientName] = useState(client.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const clientCredentials = useMemo(
    () =>
      credentials
        .filter((credential) => credential.client_id === client.id)
        .sort((a, b) => {
          const tableA = getTableName(a.table_id, tables) ?? a.platform;
          const tableB = getTableName(b.table_id, tables) ?? b.platform;
          return tableA.localeCompare(tableB, "he");
        }),
    [client.id, credentials, tables],
  );

  const tableCount = useMemo(
    () => new Set(clientCredentials.map((credential) => credential.table_id)).size,
    [clientCredentials],
  );

  useEffect(() => {
    setClientName(client.name);
    setIsEditingName(false);
    setNameError(null);
  }, [client.id, client.name]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSavingName) onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isSavingName, onClose]);

  async function handleSaveName() {
    const trimmedName = clientName.trim();

    if (!trimmedName) {
      setNameError("שם הלקוח הוא שדה חובה");
      return;
    }

    if (trimmedName === client.name) {
      setIsEditingName(false);
      setNameError(null);
      return;
    }

    setIsSavingName(true);
    setNameError(null);

    try {
      const result = await updateCredentialClientName(client.id, trimmedName);

      if (result.error) {
        setNameError(result.error);
        return;
      }

      setClientName(result.name ?? trimmedName);
      setIsEditingName(false);
      onClientRenamed(client.id, result.name ?? trimmedName);
    } catch {
      setNameError("שגיאה בלתי צפויה בעדכון שם הלקוח");
    } finally {
      setIsSavingName(false);
    }
  }

  const avatarLetter = clientName.charAt(0).toUpperCase() || "?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="סגור"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-card-title"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl"
      >
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-l from-blue-50 via-white to-white px-6 py-6">
          <div className="absolute -start-8 -top-8 h-32 w-32 rounded-full bg-blue-100/60 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-lg shadow-blue-600/20">
              {avatarLetter}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-blue-600">כרטיס לקוח</p>

              {isEditingName ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={clientName}
                    autoFocus
                    disabled={isSavingName}
                    onChange={(event) => setClientName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSaveName();
                      }
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
                  />
                  {nameError ? (
                    <p className="text-sm text-red-600">{nameError}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isSavingName}
                      onClick={() => void handleSaveName()}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSavingName ? "שומר..." : "שמור שם"}
                    </button>
                    <button
                      type="button"
                      disabled={isSavingName}
                      onClick={() => {
                        setClientName(client.name);
                        setIsEditingName(false);
                        setNameError(null);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h3
                    id="client-card-title"
                    className="text-xl font-semibold text-slate-900"
                  >
                    {clientName}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                  >
                    ערוך שם
                  </button>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  {clientCredentials.length} רשומות
                </span>
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  {tableCount} טבלאות
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white"
            >
              סגור
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-5">
          {clientCredentials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
              <p className="text-sm font-medium text-slate-600">
                אין רשומות מקושרות ללקוח זה
              </p>
              <p className="mt-1 text-sm text-slate-400">
                הוסף רשומות מטבלאות שונות כדי לראות אותן כאן
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {clientCredentials.map((credential) => {
                const tableName =
                  getTableName(credential.table_id, tables) ?? credential.platform;

                return (
                  <ClientCredentialCard
                    key={credential.id}
                    credential={credential}
                    tableName={tableName}
                    onEdit={() => onEdit(credential)}
                    onGoToTable={() => {
                      if (credential.table_id) onGoToTable(credential.table_id);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientCredentialCard({
  credential,
  tableName,
  onEdit,
  onGoToTable,
}: {
  credential: ClientCredential;
  tableName: string;
  onEdit: () => void;
  onGoToTable: () => void;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <span
          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${getPlatformBadgeClass(tableName)}`}
        >
          {tableName}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onGoToTable}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            לטבלה
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
          >
            ערוך
          </button>
        </div>
      </div>

      <dl className="grid gap-4 px-4 py-4 sm:grid-cols-2">
        <Detail label="אימייל" value={credential.login_email} copyable />
        <Detail label="משתמש" value={credential.login_username} copyable />
        <Detail label="אתר" value={credential.website_url} isLink />
        <div>
          <dt className="text-xs font-medium text-slate-500">סיסמה</dt>
          <dd className="mt-1.5 flex min-h-[28px] flex-wrap items-center gap-2 text-sm text-slate-800">
            {credential.password ? (
              <>
                <span className="rounded-lg bg-slate-50 px-2.5 py-1 font-mono text-sm">
                  {passwordVisible ? credential.password : "••••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setPasswordVisible((current) => !current)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  {passwordVisible ? "הסתר" : "הצג"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(credential.password ?? "")
                  }
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  העתק
                </button>
              </>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </dd>
        </div>
        {credential.notes ? (
          <div className="sm:col-span-2">
            <Detail label="הערות" value={credential.notes} />
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function Detail({
  label,
  value,
  isLink,
  copyable,
}: {
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
  copyable?: boolean;
}) {
  const text = value?.trim();

  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1.5 flex min-h-[28px] items-center gap-2 text-sm text-slate-800">
        {!text ? (
          <span className="text-slate-400">—</span>
        ) : isLink &&
          (text.startsWith("http://") || text.startsWith("https://")) ? (
          <a
            href={text}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-blue-600 hover:underline"
          >
            {text}
          </a>
        ) : (
          <>
            <span className="truncate">{text}</span>
            {copyable ? (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(text)}
                className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                העתק
              </button>
            ) : null}
          </>
        )}
      </dd>
    </div>
  );
}
