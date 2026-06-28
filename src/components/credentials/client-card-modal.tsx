"use client";

import { useEffect, useMemo, useState } from "react";

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
}

export function ClientCardModal({
  client,
  credentials,
  tables,
  onClose,
  onEdit,
  onGoToTable,
}: ClientCardModalProps) {
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

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

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
        aria-labelledby="client-card-title"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                כרטיס לקוח
              </p>
              <h3 id="client-card-title" className="mt-1 text-xl font-semibold text-slate-900">
                {client.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {clientCredentials.length} רשומות ב-{new Set(clientCredentials.map((c) => c.table_id)).size} טבלאות
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              סגור
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {clientCredentials.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              אין רשומות מקושרות ללקוח זה
            </p>
          ) : (
            <div className="space-y-4">
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
    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${getPlatformBadgeClass(tableName)}`}
          >
            {tableName}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onGoToTable}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
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

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Detail label="אימייל" value={credential.login_email} />
        <Detail label="משתמש" value={credential.login_username} />
        <Detail label="אתר" value={credential.website_url} isLink />
        <div>
          <dt className="text-xs font-medium text-slate-500">סיסמה</dt>
          <dd className="mt-1 flex items-center gap-2 text-sm text-slate-800">
            {credential.password ? (
              <>
                <span className="font-mono">
                  {passwordVisible ? credential.password : "••••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setPasswordVisible((current) => !current)}
                  className="rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-500 transition hover:bg-white hover:text-slate-800"
                >
                  {passwordVisible ? "הסתר" : "הצג"}
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(credential.password ?? "")}
                  className="rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-500 transition hover:bg-white hover:text-slate-800"
                >
                  העתק
                </button>
              </>
            ) : (
              "—"
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
}: {
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
}) {
  const text = value?.trim();

  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">
        {!text ? (
          "—"
        ) : isLink &&
          (text.startsWith("http://") || text.startsWith("https://")) ? (
          <a
            href={text}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {text}
          </a>
        ) : (
          text
        )}
      </dd>
    </div>
  );
}
