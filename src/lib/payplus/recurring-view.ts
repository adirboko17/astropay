import type { Json } from "@/types/database";
import type { RecurringClient } from "@/types/database";

import { fetchRecurringChargesCached } from "./cached-charges";
import { getPayPlusConfig } from "./config";
import { formatDisplayDate, parsePayPlusDate } from "./format";
import type {
  PayPlusChargeItemView,
  PayPlusPagePayload,
  PayPlusPageSummary,
  PayPlusRecurringCharge,
  PayPlusRecurringDetailView,
  PayPlusRecurringMetaView,
} from "./types";

export async function loadPayPlusPagePayload(
  clients: RecurringClient[],
): Promise<PayPlusPagePayload> {
  const fetchedAtIso = new Date().toISOString();
  let config: ReturnType<typeof getPayPlusConfig> | null = null;
  let chargesUnavailableReason: string | null = null;

  try {
    config = getPayPlusConfig();
  } catch (error) {
    chargesUnavailableReason =
      error instanceof Error ? error.message : "PayPlus env not configured";
  }

  const chargeResults = config
    ? await Promise.all(
        clients.map(async (client) => {
          const uid = client.payplus_recurring_uid;
          if (!uid) {
            return {
              clientId: client.id,
              charges: [] as PayPlusRecurringCharge[],
              error: "חסר מזהה הוראת קבע ב-PayPlus",
            };
          }

          try {
            const charges = await fetchRecurringChargesCached(uid);
            return { clientId: client.id, charges, error: null as string | null };
          } catch (error) {
            return {
              clientId: client.id,
              charges: [] as PayPlusRecurringCharge[],
              error: error instanceof Error ? error.message : "שגיאה בטעינת חיובים",
            };
          }
        }),
      )
    : [];

  const chargesByClientId = new Map(
    chargeResults.map((entry) => [entry.clientId, entry]),
  );

  const items = clients.map((client) =>
    buildRecurringDetailView(
      client,
      chargesByClientId.get(client.id)?.charges ?? [],
      chargesByClientId.get(client.id)?.error ?? chargesUnavailableReason,
    ),
  );

  const summary = buildPageSummary(clients, items);
  const failureAlerts = items.flatMap((item) =>
    item.charges
      .filter((charge) => charge.isFailed)
      .map((charge) => ({
        clientName: item.client.customer_name,
        date: charge.executionDate ?? charge.chargeDate ?? "—",
        reason: charge.failureReason ?? "חיוב נכשל",
        amount: charge.amount,
      })),
  );

  return {
    items,
    summary,
    failureAlerts,
    chargesAvailable: config !== null,
    chargesUnavailableReason,
    fetchedAtIso,
  };
}

function buildRecurringDetailView(
  client: RecurringClient,
  rawCharges: PayPlusRecurringCharge[],
  chargesError: string | null,
): PayPlusRecurringDetailView {
  const raw = asRecord(client.raw_payplus_data);
  const meta = buildMetaView(client, raw);
  const charges = rawCharges
    .map((charge, index) => mapChargeToView(charge, index))
    .sort((a, b) => compareDatesDesc(a.executionDate ?? a.chargeDate, b.executionDate ?? b.chargeDate));

  const successfulChargeCount = charges.filter((c) => c.isSuccess).length;
  const failedChargeCount = charges.filter((c) => c.isFailed).length;
  const totalCollected = charges
    .filter((c) => c.isSuccess)
    .reduce((sum, c) => sum + c.amount, 0);

  const { status, label } = resolveCurrentMonthStatus(charges, meta.nextChargeDate);

  return {
    client,
    meta,
    charges,
    chargesError,
    currentMonthStatus: status,
    currentMonthLabel: label,
    successfulChargeCount,
    failedChargeCount,
    totalCollected,
  };
}

function buildMetaView(
  client: RecurringClient,
  raw: Record<string, unknown>,
): PayPlusRecurringMetaView {
  const firstChargeDate = parsePayPlusDate(pickString(raw, "first_charge_date", "start_date"));
  const lastChargeDate = parsePayPlusDate(pickString(raw, "last_charge_date"));
  const recurringRange = pickNumber(raw, "recurring_range");
  const recurringType = pickString(raw, "recurring_type");

  const nextFromRaw = parsePayPlusDate(
    pickString(raw, "next_charge_date", "next_billing_date"),
  );
  const nextChargeDate =
    nextFromRaw ??
    computeNextChargeDate(lastChargeDate, recurringType, recurringRange) ??
    client.next_billing_date;

  return {
    referenceNumber: pickString(raw, "number"),
    payplusUid: client.payplus_recurring_uid,
    customerUid: client.payplus_customer_uid ?? pickString(raw, "customer_uid"),
    recurringType,
    recurringRange,
    numberOfCharges: pickString(raw, "number_of_charges"),
    firstChargeDate,
    lastChargeDate,
    nextChargeDate,
    endDate: parsePayPlusDate(pickString(raw, "end_date")),
    createdAt: parsePayPlusDate(pickString(raw, "created_at")),
    alreadyChargedTransfers: pickNumber(raw, "already_charged_transfers") ?? 0,
    alreadyChargedAmount: pickNumber(raw, "already_charged_amount") ?? 0,
    customerVatNumber: pickString(raw, "customer_vat_number"),
    customerPayingVat: pickBoolean(raw, "customer_paying_vat"),
    cardLast4: maskCardLast4(pickString(raw, "card_number")),
    cardExpiry: formatCardExpiry(pickString(raw, "card_expiry")),
    cashierName:
      pickString(raw, "cashier_name") ??
      (typeof raw.cashier === "object" && raw.cashier
        ? pickString(raw.cashier as Record<string, unknown>, "name")
        : null),
  };
}

function mapChargeToView(charge: PayPlusRecurringCharge, index: number): PayPlusChargeItemView {
  const statusRaw = pickString(charge, "status") ?? "unknown";
  const normalized = statusRaw.toLowerCase();
  const errorCode = pickString(charge, "errorCode", "error_code");
  const valid = pickBoolean(charge, "valid") ?? true;

  const isSuccess = normalized === "success" || normalized === "approved";
  const isFailed =
    normalized === "failed" ||
    normalized === "failure" ||
    normalized === "error" ||
    normalized === "declined" ||
    Boolean(errorCode);
  const isPending =
    !isSuccess &&
    !isFailed &&
    (normalized === "pending" || normalized === "scheduled" || !valid);

  const items = Array.isArray(charge.items) ? charge.items : [];
  const productNames = items
    .map((item) =>
      typeof item === "object" && item && "name" in item
        ? String((item as Record<string, unknown>).name ?? "")
        : "",
    )
    .filter(Boolean);

  const invoice =
    charge.invoice && typeof charge.invoice === "object"
      ? (charge.invoice as Record<string, unknown>)
      : null;

  return {
    uid: pickString(charge, "uid") ?? `charge-${index}`,
    chargeDate: parsePayPlusDate(pickString(charge, "charge_date")),
    executionDate: parsePayPlusDate(pickString(charge, "charge_execution_date", "charge_date")),
    amount: pickNumber(charge, "amount") ?? 0,
    currency: pickString(charge, "currency", "currency_code") ?? "ILS",
    status: statusRaw,
    statusLabel: translateChargeStatus(statusRaw, isFailed, errorCode),
    isSuccess,
    isFailed,
    isPending,
    failureReason: errorCode ?? (isFailed ? pickString(charge, "message", "description") : null),
    valid,
    cardLast4: maskCardLast4(pickString(charge, "card_number")),
    productSummary: productNames.length > 0 ? productNames.join(" · ") : "—",
    invoiceUrl: invoice ? pickString(invoice, "res_doc_original_url") : null,
    transactionId: pickNumber(charge, "transaction_id"),
    chargeType: pickString(charge, "charge_type"),
  };
}

function buildPageSummary(
  clients: RecurringClient[],
  items: PayPlusRecurringDetailView[],
): PayPlusPageSummary {
  const activeCount = clients.filter((c) => c.recurring_status === "active").length;
  const monthlyExpected = clients
    .filter((c) => c.recurring_status === "active")
    .reduce((sum, c) => sum + Number(c.monthly_amount || 0), 0);

  const allCharges = items.flatMap((item) => item.charges);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return {
    recurringCount: clients.length,
    activeCount,
    monthlyExpected,
    totalCollectedAllTime: allCharges
      .filter((c) => c.isSuccess)
      .reduce((sum, c) => sum + c.amount, 0),
    totalChargeEvents: allCharges.length,
    successfulCharges: allCharges.filter((c) => c.isSuccess).length,
    failedCharges: allCharges.filter((c) => c.isFailed).length,
    pendingCharges: allCharges.filter((c) => c.isPending).length,
    collectedThisMonth: allCharges
      .filter((c) => c.isSuccess && isInMonth(c.executionDate ?? c.chargeDate, monthKey))
      .reduce((sum, c) => sum + c.amount, 0),
    linkedToCustomerCount: clients.filter((c) => c.customer_id).length,
  };
}

function resolveCurrentMonthStatus(
  charges: PayPlusChargeItemView[],
  nextChargeDate: string | null,
): {
  status: PayPlusRecurringDetailView["currentMonthStatus"];
  label: string;
} {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const monthCharges = charges.filter((c) =>
    isInMonth(c.executionDate ?? c.chargeDate, monthKey),
  );

  if (monthCharges.some((c) => c.isFailed)) {
    return { status: "failed", label: "נכשל בחודש הנוכחי" };
  }
  if (monthCharges.some((c) => c.isSuccess)) {
    return { status: "charged", label: "חויב החודש" };
  }
  if (nextChargeDate && isInMonth(nextChargeDate, monthKey)) {
    return { status: "pending", label: `מתוזמן ל-${formatDisplayDate(nextChargeDate)}` };
  }
  return { status: "unknown", label: "טרם חויב החודש" };
}

function isInMonth(isoDate: string | null, monthKey: string): boolean {
  if (!isoDate) return false;
  return isoDate.slice(0, 7) === monthKey;
}

function computeNextChargeDate(
  lastChargeIso: string | null,
  recurringType: string | null,
  recurringRange: number | null,
): string | null {
  if (!lastChargeIso) return null;
  const last = new Date(`${lastChargeIso}T12:00:00`);
  if (Number.isNaN(last.getTime())) return null;

  const range = recurringRange && recurringRange > 0 ? recurringRange : 1;
  const next = new Date(last);

  if (recurringType === "weekly") {
    next.setDate(next.getDate() + 7 * range);
  } else if (recurringType === "yearly") {
    next.setFullYear(next.getFullYear() + range);
  } else {
    next.setMonth(next.getMonth() + range);
  }

  return next.toISOString().slice(0, 10);
}

function translateChargeStatus(
  status: string,
  isFailed: boolean,
  errorCode: string | null,
): string {
  if (isFailed) return errorCode ? `נכשל (${errorCode})` : "נכשל";
  const map: Record<string, string> = {
    success: "הצליח",
    approved: "אושר",
    pending: "ממתין",
    scheduled: "מתוזמן",
    failed: "נכשל",
    error: "שגיאה",
  };
  return map[status.toLowerCase()] ?? status;
}

function compareDatesDesc(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return b.localeCompare(a);
}

function asRecord(value: Json): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickBoolean(obj: Record<string, unknown>, ...keys: string[]): boolean | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
  }
  return null;
}

function maskCardLast4(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return digits || null;
  return digits.slice(-4);
}

function formatCardExpiry(value: string | null): string | null {
  if (!value || value.length !== 4) return value;
  return `${value.slice(0, 2)}/${value.slice(2)}`;
}
