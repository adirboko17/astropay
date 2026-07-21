import { fetchActiveRecurringPayments } from "./client";
import { getPayPlusConfig } from "./config";
import { mapPayPlusRecurringToClient } from "./mapper";
import type { RecurringClientUpsertRow, SyncError, SyncResult } from "./types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

const UPSERT_BATCH_SIZE = 100;

export async function syncPayPlusRecurringClients(): Promise<SyncResult> {
  const payplusConfig = getPayPlusConfig();
  const supabase = createAdminClient();

  const recurringPayments = await fetchActiveRecurringPayments(payplusConfig);

  const rows: RecurringClientUpsertRow[] = [];
  const errors: SyncError[] = [];

  for (const item of recurringPayments) {
    const { row, error } = mapPayPlusRecurringToClient(item);
    if (error) {
      errors.push(error);
      continue;
    }
    if (row) rows.push(row);
  }

  if (rows.length === 0) {
    return {
      synced_count: 0,
      created_count: 0,
      updated_count: 0,
      errors,
    };
  }

  const recurringUids = rows.map((row) => row.payplus_recurring_uid);
  const existingUids = await loadExistingRecurringUids(supabase, recurringUids);

  let createdCount = 0;
  let updatedCount = 0;

  for (let index = 0; index < rows.length; index += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + UPSERT_BATCH_SIZE).map(toDbRow);

    const { error: upsertError } = await supabase
      .from("recurring_clients")
      .upsert(batch, { onConflict: "payplus_recurring_uid" });

    if (upsertError) {
      errors.push({ message: `Database upsert failed: ${upsertError.message}` });
      continue;
    }

    for (const row of rows.slice(index, index + UPSERT_BATCH_SIZE)) {
      if (existingUids.has(row.payplus_recurring_uid)) {
        updatedCount += 1;
      } else {
        createdCount += 1;
        existingUids.add(row.payplus_recurring_uid);
      }
    }
  }

  return {
    synced_count: createdCount + updatedCount,
    created_count: createdCount,
    updated_count: updatedCount,
    errors,
  };
}

function toDbRow(row: RecurringClientUpsertRow) {
  return {
    ...row,
    raw_payplus_data: row.raw_payplus_data as Json,
  };
}

async function loadExistingRecurringUids(
  supabase: ReturnType<typeof createAdminClient>,
  recurringUids: string[],
): Promise<Set<string>> {
  const existing = new Set<string>();

  for (let index = 0; index < recurringUids.length; index += UPSERT_BATCH_SIZE) {
    const batch = recurringUids.slice(index, index + UPSERT_BATCH_SIZE);

    const { data, error } = await supabase
      .from("recurring_clients")
      .select("payplus_recurring_uid")
      .in("payplus_recurring_uid", batch);

    if (error) {
      throw new Error(`Failed to load existing clients: ${error.message}`);
    }

    for (const row of data ?? []) {
      if (row.payplus_recurring_uid) {
        existing.add(row.payplus_recurring_uid);
      }
    }
  }

  return existing;
}
