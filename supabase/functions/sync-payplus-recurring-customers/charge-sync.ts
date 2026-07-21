import type { PayPlusRecurringCharge } from "./types.ts";

const SENSITIVE_KEYS = new Set([
  "card_token",
  "cc_number",
  "cc_expiration",
  "cvv",
  "card_number",
]);

export interface ChargeCheckUpsertRow {
  recurring_client_id: string;
  payplus_transaction_uid: string | null;
  payplus_recurring_uid: string;
  payplus_charge_uid: string;
  check_month: string;
  amount: number;
  currency: string;
  status: string;
  failure_reason: string | null;
  charged_at: string | null;
  raw_payplus_data: Record<string, unknown>;
}

export function mapPayPlusChargeToCheckRow(
  charge: PayPlusRecurringCharge,
  recurringClientId: string,
  payplusRecurringUid: string,
): ChargeCheckUpsertRow | null {
  const chargeUid = pickString(charge, "uid");
  if (!chargeUid) return null;

  const chargeDate = parsePayPlusDate(
    pickString(charge, "charge_execution_date", "charge_date"),
  );
  const checkMonth = chargeDate ? chargeDate.slice(0, 7) : new Date().toISOString().slice(0, 7);

  const statusRaw = (pickString(charge, "status") ?? "unknown").toLowerCase();
  const errorCode = pickString(charge, "errorCode", "error_code");
  const isFailed =
    statusRaw === "failed" ||
    statusRaw === "failure" ||
    statusRaw === "error" ||
    statusRaw === "declined" ||
    Boolean(errorCode);

  const status = isFailed ? "failed" : statusRaw === "success" ? "success" : statusRaw;

  const transactionId = pickNumber(charge, "transaction_id");

  return {
    recurring_client_id: recurringClientId,
    payplus_transaction_uid: transactionId ? String(transactionId) : null,
    payplus_recurring_uid: payplusRecurringUid,
    payplus_charge_uid: chargeUid,
    check_month: checkMonth,
    amount: pickNumber(charge, "amount") ?? 0,
    currency: pickString(charge, "currency", "currency_code") ?? "ILS",
    status,
    failure_reason: errorCode ?? (isFailed ? pickString(charge, "message") : null),
    charged_at: chargeDate ? `${chargeDate}T12:00:00.000Z` : null,
    raw_payplus_data: sanitizeCharge(charge),
  };
}

function sanitizeCharge(raw: PayPlusRecurringCharge): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function pickString(obj: PayPlusRecurringCharge, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickNumber(obj: PayPlusRecurringCharge, ...keys: string[]): number | null {
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

function parsePayPlusDate(value: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}
