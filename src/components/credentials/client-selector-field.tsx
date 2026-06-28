"use client";

import { useEffect, useMemo, useState } from "react";

import type { CredentialClient } from "@/types/database";

interface ClientSelectorFieldProps {
  label?: string;
  clients: CredentialClient[];
  selectedClientId: string | null;
  newClientName: string;
  disabled?: boolean;
  onSelectClient: (clientId: string | null) => void;
  onNewClientNameChange: (name: string) => void;
}

export function ClientSelectorField({
  label = "לקוח / פרויקט",
  clients,
  selectedClientId,
  newClientName,
  disabled = false,
  onSelectClient,
  onNewClientNameChange,
}: ClientSelectorFieldProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewClientMode, setIsNewClientMode] = useState(selectedClientId === null);

  const selectedClient = useMemo(
    () => (clients ?? []).find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const filteredClients = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    const list = clients ?? [];

    if (!needle) return list;

    return list.filter((client) => client.name.toLowerCase().includes(needle));
  }, [clients, searchQuery]);

  useEffect(() => {
    if (selectedClientId) {
      setIsNewClientMode(false);
      setSearchQuery("");
    }
  }, [selectedClientId]);

  function startNewClientMode() {
    setIsNewClientMode(true);
    onSelectClient(null);
    setSearchQuery("");
  }

  function clearSelection() {
    onSelectClient(null);
    onNewClientNameChange("");
    setIsNewClientMode(false);
    setSearchQuery("");
  }

  return (
    <div className="block space-y-2">
      <span className="text-xs font-medium text-slate-500">{label}</span>

      {selectedClient ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-blue-900">{selectedClient.name}</p>
              <p className="mt-0.5 text-xs text-blue-700">
                לקוח קיים — הפרטים יימשכו מרשומות קודמות
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={clearSelection}
              className="shrink-0 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
              שנה
            </button>
          </div>
        </div>
      ) : isNewClientMode ? (
        <div className="space-y-2">
          <input
            type="text"
            value={newClientName}
            disabled={disabled}
            placeholder="שם הפרויקט / הלקוח"
            onChange={(event) => onNewClientNameChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setIsNewClientMode(false);
              onNewClientNameChange("");
            }}
            className="text-xs font-medium text-slate-500 transition hover:text-slate-800"
          >
            חזור לחיפוש לקוח קיים
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="search"
            value={searchQuery}
            disabled={disabled}
            placeholder="חפש לקוח לפי שם..."
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
          />

          <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            {filteredClients.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-slate-400">
                {searchQuery.trim() ? "לא נמצאו לקוחות" : "אין לקוחות עדיין"}
              </p>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectClient(client.id)}
                  className="flex w-full items-center border-b border-slate-100 px-3 py-2.5 text-start text-sm text-slate-700 transition last:border-b-0 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-50"
                >
                  {client.name}
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={startNewClientMode}
            className="text-xs font-medium text-emerald-700 transition hover:text-emerald-900"
          >
            + לקוח חדש
          </button>
        </div>
      )}
    </div>
  );
}

export function getClientNameForSave(
  clients: CredentialClient[] | null | undefined,
  selectedClientId: string | null,
  newClientName: string,
) {
  if (selectedClientId) {
    return (
      (clients ?? []).find((client) => client.id === selectedClientId)?.name ?? ""
    );
  }

  return newClientName.trim();
}
