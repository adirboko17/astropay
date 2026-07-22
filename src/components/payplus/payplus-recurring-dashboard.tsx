import { PayPlusRecurringExplorer } from "@/components/payplus/payplus-recurring-explorer";
import { formatCurrency } from "@/lib/customers/billing";
import type { PayPlusPagePayload } from "@/lib/payplus/types";
import type { Customer } from "@/types/database";

interface PayPlusRecurringDashboardProps {
  payload: PayPlusPagePayload;
  customers: Customer[];
}

export function PayPlusRecurringDashboard({
  payload,
  customers,
}: PayPlusRecurringDashboardProps) {
  const { summary } = payload;

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <OverviewMetric
            label="סה״כ הוראות"
            value={String(summary.recurringCount)}
            detail={`${summary.activeCount} פעילות`}
          />
          <OverviewMetric
            label="חיובים מוצלחים"
            value={String(summary.successfulCharges)}
            detail={`מתוך ${summary.totalChargeEvents}`}
            tone="success"
          />
          <OverviewMetric
            label="חיובים שנכשלו"
            value={String(summary.failedCharges)}
            detail={summary.failedCharges > 0 ? "דורש טיפול" : "ללא כשלונות"}
            tone={summary.failedCharges > 0 ? "danger" : "default"}
          />
          <OverviewMetric
            label="מקושרות ללקוח"
            value={String(summary.linkedToCustomerCount)}
            detail={`מתוך ${summary.recurringCount}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-7 gap-y-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500 sm:px-6">
          <SummaryItem
            label="סה״כ נגבה בהיסטוריה"
            value={formatCurrency(summary.totalCollectedAllTime)}
          />
          <SummaryItem label="ממתין או מתוזמן" value={String(summary.pendingCharges)} />
          <SummaryItem
            label="אחוז הצלחה"
            value={
              summary.totalChargeEvents > 0
                ? `${Math.round((summary.successfulCharges / summary.totalChargeEvents) * 100)}%`
                : "—"
            }
          />
        </div>
      </section>

      <PayPlusRecurringExplorer payload={payload} customers={customers} />
    </>
  );
}

function OverviewMetric({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "danger";
}) {
  const valueColor = {
    default: "text-slate-950",
    success: "text-emerald-600",
    danger: "text-rose-600",
  }[tone];

  return (
    <div className="border-s border-t border-slate-100 px-5 py-4 first:border-s-0 first:border-t-0 lg:border-t-0 lg:px-6 [&:nth-child(2)]:border-t-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <p className={`text-2xl font-bold tracking-tight tabular-nums ${valueColor}`}>{value}</p>
        <p className="mb-0.5 text-[11px] text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label}: <strong className="font-semibold text-slate-700">{value}</strong>
    </span>
  );
}
