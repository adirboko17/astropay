import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { fetchActiveRecurringPayments } from "./payplus-client.ts";
import { mapPayPlusRecurringToClient } from "./mapper.ts";
import type { RecurringClientUpsertRow, SyncError, SyncResult } from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    if (rows.length === 0) {
      return jsonResponse({
        synced_count: 0,
        created_count: 0,
        updated_count: 0,
        errors,
      } satisfies SyncResult);
    }

    const recurringUids = rows.map((row) => row.payplus_recurring_uid);
    const existingUids = await loadExistingRecurringUids(supabase, recurringUids);

    let createdCount = 0;
    let updatedCount = 0;

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

    return jsonResponse({
      synced_count: createdCount + updatedCount,
      created_count: createdCount,
      updated_count: updatedCount,
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
      errors: [{ message }],
    } satisfies SyncResult, 500);
  }
});

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
