import type {
  PayPlusRecurringPayment,
  RecurringClientUpsertRow,
  SyncError,
} from "./types.ts";

const SENSITIVE_KEYS = new Set([
  "cc_number",
  "cc_expiration",
  "cvv",
  "card_number",
  "card_expiration",
  "credit_card_number",
  "credit_card_expiration",
]);

export function isActiveRecurringPayment(item: PayPlusRecurringPayment): boolean {
  const valid = item.valid;
  if (typeof valid === "boolean") return valid;
  if (typeof valid === "string") {
    return valid.toLowerCase() === "true" || valid === "1";
  }
  if (typeof valid === "number") return valid === 1;
  return false;
}

export function sanitizePayPlusData(
  raw: PayPlusRecurringPayment,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function mapPayPlusRecurringToClient(
  item: PayPlusRecurringPayment,
): { row: RecurringClientUpsertRow | null; error: SyncError | null } {
  const recurringUid = pickString(item, "uid", "recurring_uid", "recurring_payment_uid");

  if (!recurringUid) {
    return {
      row: null,
      error: { message: "Missing recurring payment uid in PayPlus item" },
    };
  }

  const amount = pickNumber(
    item,
    "each_payment_amount",
    "amount",
    "monthly_amount",
    "payment_amount",
  );

  if (amount === null || amount < 0) {
    return {
      row: null,
      error: {
        payplus_recurring_uid: recurringUid,
        message: "Missing or invalid payment amount",
      },
    };
  }

  const customerName =
    pickString(item, "customer_name", "name", "client_name") ?? "לקוח ללא שם";

  const nextBillingDate = pickDateString(
    item,
    "next_charge_date",
    "next_billing_date",
    "first_charge_date",
    "start_date",
  );

  const billingDaySource = pickDateString(
    item,
    "first_charge_date",
    "start_date",
    "next_charge_date",
  );

  return {
    row: {
      payplus_customer_uid: pickString(item, "customer_uid", "client_uid"),
      payplus_recurring_uid: recurringUid,
      customer_name: customerName,
      customer_email: pickString(
        item,
        "customer_email",
        "email",
        "client_email",
      ) ?? extractFromExtraInfo(item, ["email", "customer_email"]),
      customer_phone: pickString(
        item,
        "customer_phone",
        "phone",
        "mobile",
        "cellphone",
      ) ?? extractFromExtraInfo(item, ["phone", "customer_phone", "mobile"]),
      website_url: pickString(item, "website_url", "website", "site_url") ??
        extractFromExtraInfo(item, ["website", "website_url", "site"]),
      monthly_amount: amount,
      currency: pickString(item, "currency_code", "currency") ?? "ILS",
      billing_day: extractBillingDay(billingDaySource),
      next_billing_date: nextBillingDate,
      recurring_status: mapRecurringStatus(item),
      source: "payplus",
      raw_payplus_data: sanitizePayPlusData(item),
    },
    error: null,
  };
}

function mapRecurringStatus(item: PayPlusRecurringPayment): string {
  if (isActiveRecurringPayment(item)) return "active";

  const status = pickString(item, "status", "recurring_status");
  if (status) return status;

  return "inactive";
}

function pickString(
  obj: PayPlusRecurringPayment,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickNumber(
  obj: PayPlusRecurringPayment,
  ...keys: string[]
): number | null {
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

function pickDateString(
  obj: PayPlusRecurringPayment,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value !== "string" || !value.trim()) continue;

    const isoDate = normalizeDate(value.trim());
    if (isoDate) return isoDate;
  }
  return null;
}

function normalizeDate(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const ddMmYyyy = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddMmYyyy) {
    return `${ddMmYyyy[3]}-${ddMmYyyy[2]}-${ddMmYyyy[1]}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10);
}

function extractBillingDay(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const day = Number(dateStr.slice(8, 10));
  return day >= 1 && day <= 31 ? day : null;
}

function extractFromExtraInfo(
  item: PayPlusRecurringPayment,
  keys: string[],
): string | null {
  const extraInfo = item.extra_info;

  if (typeof extraInfo === "string" && extraInfo.trim()) {
    try {
      const parsed = JSON.parse(extraInfo) as Record<string, unknown>;
      for (const key of keys) {
        const value = parsed[key];
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    } catch {
      return null;
    }
  }

  if (extraInfo && typeof extraInfo === "object" && !Array.isArray(extraInfo)) {
    const record = extraInfo as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  return null;
}
