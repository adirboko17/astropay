const apiKey = process.env.PAYPLUS_API_KEY?.trim();
const secretKey = process.env.PAYPLUS_SECRET_KEY?.trim();
const terminalUid = process.env.PAYPLUS_TERMINAL_UID?.trim();
const baseUrl = (process.env.PAYPLUS_API_BASE_URL ?? "").replace(/\/+$/, "");

const required = {
  PAYPLUS_API_KEY: apiKey,
  PAYPLUS_SECRET_KEY: secretKey,
  PAYPLUS_TERMINAL_UID: terminalUid,
  PAYPLUS_API_BASE_URL: baseUrl,
};

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.log("MISSING:", missing.join(", "));
  process.exit(1);
}

const url = new URL(`${baseUrl}/RecurringPayments/View`);
url.searchParams.set("terminal_uid", terminalUid);
url.searchParams.set("skip", "0");
url.searchParams.set("take", "10");

const response = await fetch(url, {
  headers: {
    "api-key": apiKey,
    "secret-key": secretKey,
    Accept: "application/json",
  },
});

const text = await response.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = { message: text.slice(0, 300) };
}

if (!response.ok) {
  const message =
    body?.message ??
    body?.error ??
    body?.description ??
    `HTTP ${response.status}`;
  console.log("FAIL:", message);
  process.exit(1);
}

const data = Array.isArray(body.data) ? body.data : [];
const active = data.filter((item) => {
  const valid = item.valid;
  if (typeof valid === "boolean") return valid;
  if (typeof valid === "string") {
    return valid.toLowerCase() === "true" || valid === "1";
  }
  if (typeof valid === "number") return valid === 1;
  return false;
});

console.log("OK: HTTP", response.status);
console.log(
  "page_count:",
  data.length,
  "total_count:",
  body.count ?? "n/a",
  "active_on_page:",
  active.length,
);

if (data[0]) {
  console.log("sample_keys:", Object.keys(data[0]).slice(0, 14).join(", "));
  const name =
    data[0].customer_name ?? data[0].client_name ?? data[0].name ?? data[0].full_name;
  if (name) console.log("sample_name:", String(name).slice(0, 80));
}
