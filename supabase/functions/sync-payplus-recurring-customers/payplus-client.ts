import type {
  PayPlusRecurringChargeListResponse,
  PayPlusRecurringListResponse,
  PayPlusRecurringPayment,
  PayPlusRecurringCharge,
} from "./types.ts";

const PAGE_SIZE = 500;

interface PayPlusConfig {
  apiKey: string;
  secretKey: string;
  terminalUid: string;
  baseUrl: string;
}

export async function fetchActiveRecurringPayments(
  config: PayPlusConfig,
): Promise<PayPlusRecurringPayment[]> {
  const allItems: PayPlusRecurringPayment[] = [];
  let skip = 0;
  let totalCount: number | null = null;

  while (true) {
    const url = buildPayPlusUrl(config.baseUrl, "RecurringPayments/View", {
      terminal_uid: config.terminalUid,
      skip: String(skip),
      take: String(PAGE_SIZE),
    });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "api-key": config.apiKey,
        "secret-key": config.secretKey,
        Accept: "application/json",
      },
    });

    const body = await parseJsonResponse(response);

    if (!response.ok) {
      const message = extractPayPlusErrorMessage(body) ??
        `PayPlus request failed with status ${response.status}`;
      throw new Error(message);
    }

    const payload = body as PayPlusRecurringListResponse;
    const pageItems = Array.isArray(payload.data) ? payload.data : [];

    if (totalCount === null && typeof payload.count === "number") {
      totalCount = payload.count;
    }

    allItems.push(...pageItems);

    if (pageItems.length < PAGE_SIZE) break;
    if (totalCount !== null && skip + PAGE_SIZE >= totalCount) break;

    skip += PAGE_SIZE;
  }

  return allItems.filter((item) => {
    const valid = item.valid;
    if (typeof valid === "boolean") return valid;
    if (typeof valid === "string") {
      return valid.toLowerCase() === "true" || valid === "1";
    }
    if (typeof valid === "number") return valid === 1;
    return false;
  });
}

export async function fetchRecurringCharges(
  config: PayPlusConfig,
  recurringUid: string,
): Promise<PayPlusRecurringCharge[]> {
  const path = `RecurringPayments/${encodeURIComponent(recurringUid)}/ViewRecurringCharge`;
  const url = buildPayPlusUrl(config.baseUrl, path, {
    terminal_uid: config.terminalUid,
    skip: "0",
    take: "500",
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "api-key": config.apiKey,
      "secret-key": config.secretKey,
      Accept: "application/json",
    },
  });

  const body = await parseJsonResponse(response);

  if (!response.ok) {
    const message = extractPayPlusErrorMessage(body) ??
      `PayPlus charges request failed with status ${response.status}`;
    throw new Error(message);
  }

  const payload = body as PayPlusRecurringChargeListResponse;
  return Array.isArray(payload.data) ? payload.data : [];
}

function buildPayPlusUrl(
  baseUrl: string,
  path: string,
  params: Record<string, string>,
): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(`${normalizedBase}/${normalizedPath}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

function extractPayPlusErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const candidates = [record.message, record.error, record.description];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}
