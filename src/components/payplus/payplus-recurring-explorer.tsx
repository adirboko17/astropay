"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { linkRecurringClient } from "@/app/customers/actions";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/payplus/format";
import { formatCurrency } from "@/lib/customers/billing";
import type { PayPlusPagePayload, PayPlusRecurringDetailView } from "@/lib/payplus/types";
import type { Customer } from "@/types/database";

interface PayPlusRecurringExplorerProps {
  payload: PayPlusPagePayload;
  customers: Customer[];
}

export function PayPlusRecurringExplorer({
  payload,
  customers,
}: PayPlusRecurringExplorerProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "failed" | "pending">("all");

  const filteredItems = useMemo(() => {
    return payload.items.filter((item) => {
      const haystack = [
        item.client.customer_name,
        item.client.customer_email,
        item.client.customer_phone,
        item.meta.referenceNumber,
        item.meta.customerVatNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query.trim() && !haystack.includes(query.trim().toLowerCase())) {
        return false;
      }

      if (statusFilter === "failed") {
        return item.failedChargeCount > 0 || item.currentMonthStatus === "failed";
      }
      if (statusFilter === "pending") {
        return item.currentMonthStatus === "pending";
      }
      return true;
    });
  }, [payload.items, query, statusFilter]);

  return (
    <div className="space-y-6">
      {payload.failureAlerts.length > 0 ? (
        <section className="rounded-2xl border border-red-200 bg-red-50/90 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-red-900">חיובים שנכשלו — דורש טיפול</h2>
          <ul className="mt-3 space-y-2">
            {payload.failureAlerts.map((alert, index) => (
              <li
                key={`${alert.clientName}-${alert.date}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-red-800"
              >
                <span className="font-medium">{alert.clientName}</span>
                <span className="text-red-600">
                  {alert.date} · {formatCurrency(alert.amount)} · {alert.reason}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!payload.chargesAvailable && payload.chargesUnavailableReason ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          לא ניתן לטעון היסטוריית חיובים מ-PayPlus: {payload.chargesUnavailableReason}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="relative z-20 border-b border-slate-100 p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <CustomersIcon />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">רשימת לקוחות PayPlus</h2>
                  <p className="text-xs text-slate-400">
                    עודכן {formatDisplayDateTime(payload.fetchedAtIso)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row xl:max-w-2xl">
              <div className="relative min-w-0 flex-1">
                <SearchIcon />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="חיפוש לפי שם, אימייל או ח.פ..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pe-10 ps-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="נקה חיפוש"
                    className="absolute end-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  >
                    <ClearIcon />
                  </button>
                ) : null}
              </div>

              <label className="relative sm:w-56">
                <span className="pointer-events-none absolute start-3 top-1.5 text-[10px] font-medium text-slate-400">
                  סינון לפי סטטוס
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as typeof statusFilter)
                  }
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pb-1 pe-9 ps-3 pt-4 text-sm font-semibold text-slate-800 outline-none transition hover:border-violet-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="all">כל הסטטוסים</option>
                  <option value="failed">עם כשלונות</option>
                  <option value="pending">ממתין לחיוב</option>
                </select>
                <ChevronDownIcon />
              </label>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            מציג {filteredItems.length} מתוך {payload.items.length} לקוחות
          </p>
        </div>

        <div className="overflow-x-auto p-2">
          <div className="min-w-[920px]">
            <div className="grid grid-cols-[minmax(280px,1fr)_130px_140px_135px_145px_48px] items-center px-4 py-2.5 text-[11px] font-semibold text-slate-500">
              <span>לקוח</span>
              <span>סכום חודשי</span>
              <span>חיוב הבא</span>
              <span>סטטוס החודש</span>
              <span>סה״כ נגבה</span>
              <span />
            </div>

            <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-600">לא נמצאו לקוחות מתאימים</p>
            <p className="mt-1 text-sm text-slate-400">נסה לשנות את החיפוש או את הסינון</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <RecurringDetailCard key={item.client.id} item={item} customers={customers} />
          ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RecurringDetailCard({
  item,
  customers,
}: {
  item: PayPlusRecurringDetailView;
  customers: Customer[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const { client, meta, charges } = item;
  const linkedCustomer = client.customer_id
    ? customers.find((customer) => customer.id === client.customer_id)
    : null;

  async function handleLinkCustomer() {
    if (!selectedCustomerId || isLinking) return;
    setIsLinking(true);
    setLinkError(null);

    try {
      const result = await linkRecurringClient(selectedCustomerId, client.id);
      if (result.error) {
        setLinkError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setLinkError("שגיאה בלתי צפויה בקישור הוראת הקבע");
    } finally {
      setIsLinking(false);
    }
  }

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-white shadow-[0_3px_12px_rgba(15,23,42,0.045)] transition ${
        expanded ? "border-violet-200" : "border-slate-100 hover:border-slate-200"
      }`}
    >
      <div
        className="grid min-h-[68px] cursor-pointer grid-cols-[minmax(280px,1fr)_130px_140px_135px_145px_48px] items-center"
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest("button, a")) setExpanded((value) => !value);
        }}
      >
        <div className="flex min-w-0 items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-sm font-bold text-violet-700">
            {getInitials(client.customer_name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-bold text-slate-900">{client.customer_name}</h3>
              {item.failedChargeCount > 0 ? (
                <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-rose-100">
                  {item.failedChargeCount} כשלונות
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-slate-400">
              הוראה {meta.referenceNumber ?? "—"}
              {client.customer_email ? ` · ${client.customer_email}` : ""}
            </p>
          </div>
        </div>

        <div className="px-3 py-3 text-sm font-bold tabular-nums text-slate-900">
          {formatCurrency(Number(client.monthly_amount), client.currency)}
        </div>
        <div className="px-3 py-3 text-sm tabular-nums text-slate-700">
          {formatDisplayDate(meta.nextChargeDate)}
        </div>
        <div className="px-3 py-3">
          <StatusBadge label={item.currentMonthLabel} tone={monthStatusTone(item.currentMonthStatus)} />
        </div>
        <div className="px-3 py-3">
          <p className="text-sm font-semibold tabular-nums text-slate-800">
            {formatCurrency(item.totalCollected, client.currency)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {item.successfulChargeCount} חיובים
          </p>
        </div>
        <div className="flex justify-center px-1 py-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? "צמצם פרטי לקוח" : "הרחב פרטי לקוח"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              expanded
                ? "bg-violet-50 text-violet-600"
                : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
          >
            <RowChevronIcon expanded={expanded} />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:px-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={client.recurring_status === "active" ? "הוראה פעילה" : "הוראה לא פעילה"} tone={client.recurring_status === "active" ? "success" : "neutral"} />
              <span className="text-xs text-slate-400">
                UID {meta.payplusUid?.slice(0, 8) ?? "—"}…
              </span>
            </div>
            {client.customer_id ? (
              <Link
                href={`/customers/${client.customer_id}`}
                className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
              >
                {linkedCustomer ? `מקושר ל${linkedCustomer.name}` : "מעבר לכרטיס לקוח"}
              </Link>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCustomerId}
                  disabled={isLinking}
                  onChange={(event) => {
                    setSelectedCustomerId(event.target.value);
                    setLinkError(null);
                  }}
                  aria-label="בחר לקוח לקישור"
                  className="h-9 min-w-56 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:opacity-60"
                >
                  <option value="">בחירת לקוח לקישור...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.company ? ` · ${customer.company}` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedCustomerId || isLinking}
                  onClick={handleLinkCustomer}
                  className="h-9 rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLinking ? "מקשר..." : "קשר ללקוח"}
                </button>
              </div>
            )}
          </div>
          {linkError ? (
            <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              {linkError}
            </p>
          ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="סכום חודשי" value={formatCurrency(Number(client.monthly_amount), client.currency)} />
          <MetricTile label="חיוב הבא" value={formatDisplayDate(meta.nextChargeDate)} />
          <MetricTile label="חיוב אחרון" value={formatDisplayDate(meta.lastChargeDate)} />
          <MetricTile
            label="סה״כ נגבה (מ-PayPlus)"
            value={formatCurrency(item.totalCollected, client.currency)}
            hint={`${item.successfulChargeCount} חיובים מוצלחים`}
          />
        </div>
        <div className="mt-6 space-y-6">
          <section>
            <h4 className="text-sm font-semibold text-slate-900">פרטי הוראת קבע</h4>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField label="תדירות" value={formatRecurring(meta.recurringType, meta.recurringRange)} />
              <DetailField label="מספר חיובים מתוכנן" value={meta.numberOfCharges ?? "—"} />
              <DetailField label="חיוב ראשון" value={formatDisplayDate(meta.firstChargeDate)} />
              <DetailField label="תאריך יצירה" value={formatDisplayDate(meta.createdAt)} />
              <DetailField label="תאריך סיום" value={formatDisplayDate(meta.endDate) ?? "ללא"} />
              <DetailField label="יום חיוב (במערכת)" value={client.billing_day ? String(client.billing_day) : "—"} />
              <DetailField label="מספר חיובים שבוצעו" value={String(meta.alreadyChargedTransfers)} />
              <DetailField label="סכום שכבר נגבה (PayPlus)" value={formatCurrency(meta.alreadyChargedAmount, client.currency)} />
              <DetailField label="מסוף / קופה" value={meta.cashierName ?? "—"} />
            </dl>
          </section>

          <section>
            <h4 className="text-sm font-semibold text-slate-900">פרטי לקוח ותשלום</h4>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField label="אימייל" value={client.customer_email ?? "—"} />
              <DetailField label="טלפון" value={client.customer_phone ?? "—"} />
              <DetailField label="ח.פ / ע.מ" value={meta.customerVatNumber ?? "—"} />
              <DetailField label="מזהה לקוח PayPlus" value={meta.customerUid ?? "—"} mono />
              <DetailField
                label="מע״מ"
                value={
                  meta.customerPayingVat === null
                    ? "—"
                    : meta.customerPayingVat
                      ? "לקוח חייב במע״מ"
                      : "ללא מע״מ"
                }
              />
              <DetailField
                label="אמצעי תשלום"
                value={
                  meta.cardLast4
                    ? `כרטיס ···${meta.cardLast4}${meta.cardExpiry ? ` · ${meta.cardExpiry}` : ""}`
                    : "—"
                }
              />
              <DetailField label="אתר" value={client.website_url ?? "—"} />
            </dl>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900">היסטוריית חיובים</h4>
              <p className="text-xs text-slate-500">
                {charges.length} רשומות · {item.successfulChargeCount} הצליחו ·{" "}
                {item.failedChargeCount} נכשלו
              </p>
            </div>

            {item.chargesError ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {item.chargesError}
              </p>
            ) : charges.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">אין חיובים להצגה</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                      <th className="px-4 py-3 text-start">תאריך מתוכנן</th>
                      <th className="px-4 py-3 text-start">בוצע</th>
                      <th className="px-4 py-3 text-start">סכום</th>
                      <th className="px-4 py-3 text-start">סטטוס</th>
                      <th className="px-4 py-3 text-start">פריט / שירות</th>
                      <th className="px-4 py-3 text-start">כרטיס</th>
                      <th className="px-4 py-3 text-start">עסקה</th>
                      <th className="px-4 py-3 text-start">חשבונית</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charges.map((charge, index) => (
                      <tr
                        key={charge.uid}
                        className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                      >
                        <td className="border-t border-slate-100 px-4 py-3 text-slate-700">
                          {formatDisplayDate(charge.chargeDate)}
                        </td>
                        <td className="border-t border-slate-100 px-4 py-3 text-slate-700">
                          {formatDisplayDate(charge.executionDate)}
                        </td>
                        <td className="border-t border-slate-100 px-4 py-3 font-medium text-slate-900">
                          {formatCurrency(charge.amount, charge.currency)}
                        </td>
                        <td className="border-t border-slate-100 px-4 py-3">
                          <ChargeStatusBadge charge={charge} />
                          {charge.failureReason ? (
                            <p className="mt-1 text-xs text-red-600">{charge.failureReason}</p>
                          ) : null}
                        </td>
                        <td className="border-t border-slate-100 px-4 py-3 text-slate-600">
                          {charge.productSummary}
                        </td>
                        <td className="border-t border-slate-100 px-4 py-3 text-slate-600">
                          {charge.cardLast4 ? `···${charge.cardLast4}` : "—"}
                        </td>
                        <td className="border-t border-slate-100 px-4 py-3 font-mono text-xs text-slate-500">
                          {charge.transactionId ?? "—"}
                        </td>
                        <td className="border-t border-slate-100 px-4 py-3">
                          {charge.invoiceUrl ? (
                            <a
                              href={charge.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-violet-700 hover:text-violet-900"
                            >
                              PDF
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
        </div>
      ) : null}
    </article>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className={`mt-1 text-sm text-slate-800 ${mono ? "font-mono text-xs break-all" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "danger" | "warning" | "neutral";
}) {
  const styles = {
    success: "bg-emerald-100 text-emerald-800 border-emerald-200",
    danger: "bg-red-100 text-red-800 border-red-200",
    warning: "bg-amber-100 text-amber-900 border-amber-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  }[tone];

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {label}
    </span>
  );
}

function ChargeStatusBadge({
  charge,
}: {
  charge: PayPlusRecurringDetailView["charges"][number];
}) {
  if (charge.isSuccess) {
    return <StatusBadge label={charge.statusLabel} tone="success" />;
  }
  if (charge.isFailed) {
    return <StatusBadge label={charge.statusLabel} tone="danger" />;
  }
  if (charge.isPending) {
    return <StatusBadge label={charge.statusLabel} tone="warning" />;
  }
  return <StatusBadge label={charge.statusLabel} tone="neutral" />;
}

function monthStatusTone(
  status: PayPlusRecurringDetailView["currentMonthStatus"],
): "success" | "danger" | "warning" | "neutral" {
  if (status === "charged") return "success";
  if (status === "failed") return "danger";
  if (status === "pending") return "warning";
  return "neutral";
}

function formatRecurring(type: string | null, range: number | null): string {
  if (!type) return "—";
  const labels: Record<string, string> = {
    monthly: "חודשי",
    weekly: "שבועי",
    yearly: "שנתי",
  };
  const base = labels[type] ?? type;
  if (range && range > 1) return `כל ${range} ${base}`;
  return base;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words[words.length - 1][0]}`;
  return name.trim().slice(0, 2);
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m8 10 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RowChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CustomersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
