import type { ClientCredential, CredentialTable } from "@/types/database";

export function findTableFromParam(
  param: string | null,
  tables: CredentialTable[],
) {
  if (!param) return null;
  return tables.find((table) => table.id === param) ?? null;
}

export function countCredentialsForTable(
  credentials: ClientCredential[],
  tableId: string | null,
) {
  if (!tableId) return credentials.length;
  return credentials.filter((credential) => credential.table_id === tableId)
    .length;
}

export function getTableName(
  tableId: string | null | undefined,
  tables: CredentialTable[],
) {
  if (!tableId) return null;
  return tables.find((table) => table.id === tableId)?.name ?? null;
}
