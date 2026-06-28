import type { ClientCredential, CredentialTable } from "@/types/database";

export interface TableListItem extends CredentialTable {
  recordCount: number;
}

export interface GroupedTables {
  today: TableListItem[];
  lastWeek: TableListItem[];
  older: TableListItem[];
}

export function getTableSortTimestamp(table: CredentialTable) {
  return table.last_viewed_at ?? table.updated_at;
}

export function buildTableListItems(
  tables: CredentialTable[],
  credentials: Pick<ClientCredential, "table_id">[],
): TableListItem[] {
  return [...tables]
    .map((table) => ({
      ...table,
      recordCount: credentials.filter(
        (credential) => credential.table_id === table.id,
      ).length,
    }))
    .sort((a, b) => {
      const aViewed = a.last_viewed_at
        ? new Date(a.last_viewed_at).getTime()
        : 0;
      const bViewed = b.last_viewed_at
        ? new Date(b.last_viewed_at).getTime()
        : 0;

      if (aViewed !== bViewed) {
        return bViewed - aViewed;
      }

      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
}

export function groupTablesByRecency(items: TableListItem[]): GroupedTables {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const today: TableListItem[] = [];
  const lastWeek: TableListItem[] = [];
  const older: TableListItem[] = [];

  for (const item of items) {
    const viewed = new Date(getTableSortTimestamp(item));

    if (viewed >= startOfToday) {
      today.push(item);
    } else if (viewed >= sevenDaysAgo) {
      lastWeek.push(item);
    } else {
      older.push(item);
    }
  }

  return { today, lastWeek, older };
}

export function formatTableDate(isoDate: string | null) {
  if (!isoDate) {
    return "—";
  }
  const date = new Date(isoDate);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  if (date >= startOfToday) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function getTableIconColor(name: string) {
  const value = name.toLowerCase();

  if (value.includes("supabase")) return "bg-emerald-600";
  if (value.includes("gmail") || value.includes("google")) return "bg-red-500";
  if (value.includes("vercel")) return "bg-slate-900";
  if (value.includes("excel")) return "bg-green-700";

  return "bg-blue-600";
}
