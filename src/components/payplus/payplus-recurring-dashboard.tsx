import { PayPlusRecurringExplorer } from "@/components/payplus/payplus-recurring-explorer";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/customers/billing";
import type { PayPlusPagePayload } from "@/lib/payplus/types";

interface PayPlusRecurringDashboardProps {
  payload: PayPlusPagePayload;
}

export function PayPlusRecurringDashboard({ payload }: PayPlusRecurringDashboardProps) {
  const { summary } = payload;

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="סה״כ הוראות קבע" value={String(summary.recurringCount)} />
        <StatCard label="פעילות" value={String(summary.activeCount)} />
        <StatCard
          label="חיובים מוצלחים"
          value={String(summary.successfulCharges)}
          hint={`מתוך ${summary.totalChargeEvents} אירועי חיוב`}
        />
        <StatCard
          label="חיובים שנכשלו"
          value={String(summary.failedCharges)}
          hint={summary.failedCharges > 0 ? "ראה התראות למעלה" : "אין כשלונות"}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="נגבה החודש"
          value={formatCurrency(summary.collectedThisMonth)}
        />
        <StatCard
          label="סה״כ נגבה (היסטוריה)"
          value={formatCurrency(summary.totalCollectedAllTime)}
        />
        <StatCard
          label="מקושרות ללקוח"
          value={String(summary.linkedToCustomerCount)}
          hint="קישור מעמוד הלקוח"
        />
        <StatCard
          label="ממתין / מתוזמן"
          value={String(summary.pendingCharges)}
        />
      </section>

      <PayPlusRecurringExplorer payload={payload} />
    </>
  );
}
