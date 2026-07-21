"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatDisplayDate, formatDisplayDateTime } from "@/lib/payplus/format";
import { formatCurrency } from "@/lib/customers/billing";
import type { PayPlusPagePayload, PayPlusRecurringDetailView } from "@/lib/payplus/types";

interface PayPlusRecurringExplorerProps {
  payload: PayPlusPagePayload;
}

export function PayPlusRecurringExplorer({ payload }: PayPlusRecurringExplorerProps) {
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

      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">כל הוראות הקבע</h2>
            <p className="mt-1 text-sm text-slate-500">
              עודכן מ-PayPlus · {formatDisplayDateTime(payload.fetchedAtIso)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי שם, אימייל, ח.פ…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 sm:w-64"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="failed">עם כשלונות</option>
              <option value="pending">ממתין לחיוב החודש</option>
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          מציג {filteredItems.length} מתוך {payload.items.length} הוראות קבע
        </p>
      </section>

      <div className="space-y-5">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-slate-400">
            לא נמצאו הוראות קבע לפי הסינון
          </div>
        ) : (
          filteredItems.map((item) => (
            <RecurringDetailCard key={item.client.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
}

function RecurringDetailCard({ item }: { item: PayPlusRecurringDetailView }) {
  const [expanded, setExpanded] = useState(true);
  const { client, meta, charges } = item;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <header className="border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{client.customer_name}</h3>
              <StatusBadge label={client.recurring_status === "active" ? "פעילה" : "לא פעילה"} tone={client.recurring_status === "active" ? "success" : "neutral"} />
              <StatusBadge label={item.currentMonthLabel} tone={monthStatusTone(item.currentMonthStatus)} />
              {item.failedChargeCount > 0 ? (
                <StatusBadge label={`${item.failedChargeCount} כשלונות`} tone="danger" />
              ) : null}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              מס׳ הוראה {meta.referenceNumber ?? "—"} · UID {meta.payplusUid?.slice(0, 8) ?? "—"}…
            </p>
          </div>

          <div className="flex items-center gap-2">
            {client.customer_id ? (
              <Link
                href={`/customers/${client.customer_id}`}
                className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 transition hover:bg-violet-100"
              >
                לכרטיס לקוח
              </Link>
            ) : (
              <span className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500">
                לא מקושר ללקוח
              </span>
            )}
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {expanded ? "צמצם" : "הרחב"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="סכום חודשי" value={formatCurrency(Number(client.monthly_amount), client.currency)} />
          <MetricTile label="חיוב הבא" value={formatDisplayDate(meta.nextChargeDate)} />
          <MetricTile label="חיוב אחרון" value={formatDisplayDate(meta.lastChargeDate)} />
          <MetricTile
            label="סה״כ נגבה (מ-PayPlus)"
            value={formatCurrency(item.totalCollected, client.currency)}
            hint={`${item.successfulChargeCount} חיובים מוצלחים`}
          />
        </div>
      </header>

      {expanded ? (
        <div className="space-y-6 px-5 py-6 sm:px-6">
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
