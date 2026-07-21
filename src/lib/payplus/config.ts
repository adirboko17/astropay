import type { PayPlusConfig } from "./types";

export function getPayPlusConfig(): PayPlusConfig {
  const apiKey = process.env.PAYPLUS_API_KEY?.trim();
  const secretKey = process.env.PAYPLUS_SECRET_KEY?.trim();
  const terminalUid = process.env.PAYPLUS_TERMINAL_UID?.trim();
  const baseUrl = process.env.PAYPLUS_API_BASE_URL?.trim();

  const missing: string[] = [];
  if (!apiKey) missing.push("PAYPLUS_API_KEY");
  if (!secretKey) missing.push("PAYPLUS_SECRET_KEY");
  if (!terminalUid) missing.push("PAYPLUS_TERMINAL_UID");
  if (!baseUrl) missing.push("PAYPLUS_API_BASE_URL");

  if (missing.length > 0) {
    throw new Error(`Missing PayPlus env: ${missing.join(", ")}`);
  }

  return {
    apiKey: apiKey!,
    secretKey: secretKey!,
    terminalUid: terminalUid!,
    baseUrl: baseUrl!,
  };
}
