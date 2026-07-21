import { PayPlusRecurringDashboard } from "@/components/payplus/payplus-recurring-dashboard";
import { PayPlusSyncButton } from "@/components/payplus/payplus-sync-button";
import { PageHero } from "@/components/layout/page-hero";
import { formatCurrency } from "@/lib/customers/billing";
import { loadPayPlusPagePayload } from "@/lib/payplus/recurring-view";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PayPlusPageContent() {
  const supabase = createAdminClient();
  const { data: clients, error } = await supabase
    .from("recurring_clients")
    .select("*")
    .order("customer_name", { ascending: true });

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-medium">לא ניתן לטעון נתונים</p>
        <p className="mt-1">{error.message}</p>
      </div>
    );
  }

  const payload = await loadPayPlusPagePayload(clients ?? []);
  const { summary } = payload;
  const activePercent =
    summary.recurringCount > 0 ? (summary.activeCount / summary.recurringCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHero
        title="PayPlus — הוראות קבע"
        description="פירוט מלא: לוחות זמנים, היסטוריית חיובים, הצלחות וכשלונות — ישירות מ-PayPlus"
        accent="violet"
        metrics={[
          {
            label: "הכנסה חודשית צפויה",
            value: formatCurrency(summary.monthlyExpected),
          },
          {
            label: "נגבה החודש",
            value: formatCurrency(summary.collectedThisMonth),
          },
        ]}
        progress={
          summary.recurringCount > 0
            ? {
                percent: activePercent,
                label: "הוראות קבע פעילות",
                startLabel: `${summary.activeCount} פעילות`,
                endLabel: `מתוך ${summary.recurringCount}`,
              }
            : undefined
        }
      >
        <PayPlusSyncButton />
      </PageHero>

      <PayPlusRecurringDashboard payload={payload} />
    </div>
  );
}
