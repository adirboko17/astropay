import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { mapPayPlusChargeToCheckRow } from "./charge-sync.ts";
import { fetchActiveRecurringPayments, fetchRecurringCharges } from "./payplus-client.ts";
import { mapPayPlusRecurringToClient } from "./mapper.ts";
import type { RecurringClientUpsertRow, SyncError, SyncResult } from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const UPSERT_BATCH_SIZE = 100;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    assertAuthorized(req);

    const payplusConfig = getPayPlusConfig();
    const supabase = createServiceRoleClient();

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

    let createdCount = 0;
    let updatedCount = 0;

    if (rows.length > 0) {
      const recurringUids = rows.map((row) => row.payplus_recurring_uid);
      const existingUids = await loadExistingRecurringUids(supabase, recurringUids);

      for (let index = 0; index < rows.length; index += UPSERT_BATCH_SIZE) {
        const batch = rows.slice(index, index + UPSERT_BATCH_SIZE);

        const { error: upsertError } = await supabase
          .from("recurring_clients")
          .upsert(batch, { onConflict: "payplus_recurring_uid" });

        if (upsertError) {
          errors.push({ message: `Database upsert failed: ${upsertError.message}` });
          continue;
        }

        for (const row of batch) {
          if (existingUids.has(row.payplus_recurring_uid)) {
            updatedCount += 1;
          } else {
            createdCount += 1;
            existingUids.add(row.payplus_recurring_uid);
          }
        }
      }
    }

    const chargesSyncedCount = await syncAllRecurringCharges(
      supabase,
      payplusConfig,
      errors,
    );

    return jsonResponse({
      synced_count: createdCount + updatedCount,
      created_count: createdCount,
      updated_count: updatedCount,
      charges_synced_count: chargesSyncedCount,
      errors,
    } satisfies SyncResult);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unexpected sync error";

    console.error("sync-payplus-recurring-customers failed:", message);

    return jsonResponse({
      synced_count: 0,
      created_count: 0,
      updated_count: 0,
      charges_synced_count: 0,
      errors: [{ message }],
    } satisfies SyncResult, error instanceof UnauthorizedError ? 401 : 500);
  }
});

class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

function assertAuthorized(req: Request) {
  const cronSecret = Deno.env.get("PAYPLUS_CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");

  if (cronSecret && headerSecret && headerSecret === cronSecret) {
    return;
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return;
  }

  throw new UnauthorizedError();
}

async function syncAllRecurringCharges(
  supabase: ReturnType<typeof createClient>,
  payplusConfig: ReturnType<typeof getPayPlusConfig>,
  errors: SyncError[],
): Promise<number> {
  const { data: clients, error } = await supabase
    .from("recurring_clients")
    .select("id, payplus_recurring_uid")
    .not("payplus_recurring_uid", "is", null);

  if (error) {
    errors.push({ message: `Failed to load recurring clients: ${error.message}` });
    return 0;
  }

  let synced = 0;

  for (const client of clients ?? []) {
    const recurringUid = client.payplus_recurring_uid;
    if (!recurringUid) continue;

    try {
      const charges = await fetchRecurringCharges(payplusConfig, recurringUid);
      const chargeRows = charges
        .map((charge) =>
          mapPayPlusChargeToCheckRow(charge, client.id, recurringUid)
        )
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (chargeRows.length === 0) continue;

      const { error: upsertError } = await supabase
        .from("recurring_charge_checks")
        .upsert(chargeRows, { onConflict: "payplus_charge_uid" });

      if (upsertError) {
        errors.push({
          payplus_recurring_uid: recurringUid,
          message: `Charge upsert failed: ${upsertError.message}`,
        });
        continue;
      }

      synced += chargeRows.length;
      await updateClientChargeSummary(supabase, client.id, chargeRows);
    } catch (chargeError) {
      errors.push({
        payplus_recurring_uid: recurringUid,
        message: chargeError instanceof Error
          ? chargeError.message
          : "Charge sync failed",
      });
    }
  }

  return synced;
}

async function updateClientChargeSummary(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  chargeRows: Array<{
    status: string;
    failure_reason: string | null;
    charged_at: string | null;
  }>,
) {
  const successRows = chargeRows
    .filter((row) => row.status === "success")
    .sort((a, b) => (b.charged_at ?? "").localeCompare(a.charged_at ?? ""));

  const failedRows = chargeRows
    .filter((row) => row.status === "failed")
    .sort((a, b) => (b.charged_at ?? "").localeCompare(a.charged_at ?? ""));

  const latestSuccess = successRows[0];
  const latestFailed = failedRows[0];

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthSuccess = chargeRows.some(
    (row) => row.status === "success" && row.charged_at?.startsWith(monthKey),
  );
  const monthFailed = chargeRows.some(
    (row) => row.status === "failed" && row.charged_at?.startsWith(monthKey),
  );

  let currentMonthStatus = "unknown";
  if (monthFailed) currentMonthStatus = "failed";
  else if (monthSuccess) currentMonthStatus = "charged";

  await supabase
    .from("recurring_clients")
    .update({
      current_month_status: currentMonthStatus,
      last_successful_charge_at: latestSuccess?.charged_at ?? null,
      last_failed_charge_at: latestFailed?.charged_at ?? null,
      last_failure_reason: latestFailed?.failure_reason ?? null,
    })
    .eq("id", clientId);
}

function getPayPlusConfig() {
  const apiKey = Deno.env.get("PAYPLUS_API_KEY");
  const secretKey = Deno.env.get("PAYPLUS_SECRET_KEY");
  const terminalUid = Deno.env.get("PAYPLUS_TERMINAL_UID");
  const baseUrl = Deno.env.get("PAYPLUS_API_BASE_URL");

  const missing: string[] = [];
  if (!apiKey) missing.push("PAYPLUS_API_KEY");
  if (!secretKey) missing.push("PAYPLUS_SECRET_KEY");
  if (!terminalUid) missing.push("PAYPLUS_TERMINAL_UID");
  if (!baseUrl) missing.push("PAYPLUS_API_BASE_URL");

  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(", ")}`);
  }

  return {
    apiKey: apiKey!,
    secretKey: secretKey!,
    terminalUid: terminalUid!,
    baseUrl: baseUrl!,
  };
}

function createServiceRoleClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role configuration");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function loadExistingRecurringUids(
  supabase: ReturnType<typeof createClient>,
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      Connection: "keep-alive",
    },
  });
}
