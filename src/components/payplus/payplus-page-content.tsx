import { PayPlusRecurringDashboard } from "@/components/payplus/payplus-recurring-dashboard";
import { PayPlusSyncButton } from "@/components/payplus/payplus-sync-button";
import { formatCurrency } from "@/lib/customers/billing";
import { loadPayPlusPagePayload } from "@/lib/payplus/recurring-view";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PayPlusPageContent() {
  const supabase = createAdminClient();
  const [clientsResult, customersResult] = await Promise.all([
    supabase
      .from("recurring_clients")
      .select("*")
      .order("customer_name", { ascending: true }),
    supabase
      .from("credential_clients")
      .select("*")
      .order("name", { ascending: true }),
  ]);

  const loadError = clientsResult.error ?? customersResult.error;
  if (loadError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-medium">לא ניתן לטעון נתונים</p>
        <p className="mt-1">{loadError.message}</p>
      </div>
    );
  }

  const payload = await loadPayPlusPagePayload(clientsResult.data ?? []);
  const { summary } = payload;
  const activePercent =
    summary.recurringCount > 0 ? (summary.activeCount / summary.recurringCount) * 100 : 0;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <PayPlusMark />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-600">
                PayPlus
              </p>
              <h1 className="mt-0.5 text-xl font-bold text-slate-950 sm:text-2xl">הוראות קבע</h1>
              <p className="mt-1 text-sm text-slate-500">
                מעקב אחר חיובים חודשיים וחיבורם ללקוחות
              </p>
            </div>
          </div>
          <PayPlusSyncButton />
        </div>

        <div className="grid border-t border-slate-100 sm:grid-cols-[1fr_1fr_1.35fr]">
          <HeaderMetric
            label="הכנסה חודשית צפויה"
            value={formatCurrency(summary.monthlyExpected)}
          />
          <HeaderMetric
            label="נגבה החודש"
            value={formatCurrency(summary.collectedThisMonth)}
            tone="success"
          />
          <div className="border-t border-slate-100 px-5 py-4 sm:border-s sm:border-t-0 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">הוראות פעילות</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {summary.activeCount} מתוך {summary.recurringCount}
                </p>
              </div>
              <span className="text-sm font-bold tabular-nums text-emerald-600">
                {Math.round(activePercent)}%
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(activePercent, 100))}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <PayPlusRecurringDashboard payload={payload} customers={customersResult.data ?? []} />
    </div>
  );
}

function HeaderMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success";
}) {
  return (
    <div className="border-t border-slate-100 px-5 py-4 first:border-t-0 sm:border-s sm:border-t-0 sm:px-6 sm:first:border-s-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${
          tone === "success" ? "text-emerald-600" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PayPlusMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 7.5h9a4 4 0 0 1 0 8H9" strokeLinecap="round" />
      <path d="M9 4v16M5 11h8" strokeLinecap="round" />
    </svg>
  );
}
