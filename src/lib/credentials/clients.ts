import type { ClientCredential, CredentialClient } from "@/types/database";

export function getCredentialsForClient(
  credentials: ClientCredential[],
  clientId: string,
) {
  return credentials.filter((credential) => credential.client_id === clientId);
}

export function countCredentialsForClient(
  credentials: ClientCredential[],
  clientId: string | null | undefined,
) {
  if (!clientId) return 0;
  return getCredentialsForClient(credentials, clientId).length;
}

export function findClientById(
  clients: CredentialClient[] | null | undefined,
  clientId: string | null | undefined,
) {
  if (!clientId || !clients) return null;
  return clients.find((client) => client.id === clientId) ?? null;
}

export function sortClients(clients: CredentialClient[] | null | undefined) {
  return [...(clients ?? [])].sort((a, b) => a.name.localeCompare(b.name, "he"));
}

export function buildDraftFromClientCredentials(
  credentials: ClientCredential[],
  clientName: string,
  excludeTableId?: string | null,
) {
  const relevant = credentials
    .filter((credential) => !excludeTableId || credential.table_id !== excludeTableId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const draft = {
    client_name: clientName,
    login_email: "",
    login_username: "",
    password: "",
    website_url: "",
    notes: "",
  };

  for (const record of relevant) {
    if (!draft.login_email && record.login_email) {
      draft.login_email = record.login_email;
    }
    if (!draft.login_username && record.login_username) {
      draft.login_username = record.login_username;
    }
    if (!draft.password && record.password) {
      draft.password = record.password;
    }
    if (!draft.website_url && record.website_url) {
      draft.website_url = record.website_url;
    }
    if (!draft.notes && record.notes) {
      draft.notes = record.notes;
    }
  }

  return draft;
}
