import Link from "next/link";

import { formatCurrency, formatDate } from "@/lib/customers/billing";
import type { DashboardStats, Insight } from "@/lib/dashboard/stats";

interface MainDashboardProps {
  stats: DashboardStats;
  userName?: string;
}

export function MainDashboard({ stats, userName }: MainDashboardProps) {
  const ratePercent = Math.round(stats.collections.collectionRate * 100);
  const now = new Date();
  const greeting = getGreeting(now, userName);
  const dateLabel = new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-blue-700 via-indigo-700 to-slate-900 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -start-20 -top-24 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 end-10 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-blue-200">{dateLabel}</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{greeting}</h1>
            <p className="mt-2 max-w-md text-sm text-blue-100/80">
              {stats.collections.remaining > 0
                ? `נותרו ${formatCurrency(stats.collections.remaining)} לגבייה מ-${stats.customers.billingCount} לקוחות`
                : "כל הגבייה הושלמה — אין יתרות פתוחות"}
            </p>
          </div>

          <div className="flex flex-wrap gap-6 sm:gap-10">
            <HeroMetric label="שולם" value={formatCurrency(stats.collections.totalPaid)} />
            <HeroMetric label="נותר לגבות" value={formatCurrency(stats.collections.remaining)} />
            <HeroMetric
              label="הכנסה חודשית (PayPlus)"
              value={formatCurrency(stats.payplus.monthlyExpected)}
            />
          </div>
        </div>

        {/* Collection progress */}
        <div className="relative mt-7">
          <div className="flex items-center justify-between text-xs text-blue-100/80">
            <span>התקדמות גבייה</span>
            <span className="font-semibold text-white">{ratePercent}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-l from-emerald-300 to-emerald-500 transition-all"
              style={{ width: `${ratePercent}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-blue-200/70">
            <span>{formatCurrency(stats.collections.totalPaid)} נגבו</span>
            <span>מתוך {formatCurrency(stats.collections.totalDue)}</span>
          </div>
        </div>
      </section>

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="לקוחות עם גבייה"
          value={String(stats.customers.billingCount)}
          hint={`${stats.collections.paidCount} שילמו במלואם`}
          icon={<UsersGlyph />}
          accent="blue"
          href="/customers"
        />
        <KpiCard
          label="פרויקטים שלי"
          value={String(stats.customers.projectsCount)}
          hint="ללא סכום גבייה"
          icon={<FolderGlyph />}
          accent="violet"
          href="/projects"
        />
        <KpiCard
          label="לא שילמו כלל"
          value={String(stats.collections.unpaidCount)}
          hint={`${stats.collections.partialCount} שילמו חלקית`}
          icon={<AlertGlyph />}
          accent={stats.collections.unpaidCount > 0 ? "red" : "emerald"}
          href="/collections"
        />
        <KpiCard
          label="רשומות התחברות"
          value={String(stats.credentials.recordsCount)}
          hint={`ב-${stats.credentials.tablesCount} טבלאות`}
          icon={<KeyGlyph />}
          accent="amber"
          href="/credentials"
        />
      </section>

      {/* Insights */}
      {stats.insights.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <SparkGlyph />
            תובנות
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.insights.map((insight) => (
              <InsightCard key={insight.title} insight={insight} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Lists */}
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">חייבים מובילים</h3>
              <p className="mt-0.5 text-xs text-slate-500">הלקוחות עם היתרה הגבוהה ביותר</p>
            </div>
            <Link
              href="/collections"
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              לכל הגבייה
            </Link>
          </div>

          {stats.topDebtors.length === 0 ? (
            <EmptyState text="אין יתרות פתוחות — הכל נגבה" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.topDebtors.map((debtor) => {
                const paidPercent =
                  debtor.totalDue > 0
                    ? Math.round((debtor.totalPaid / debtor.totalDue) * 100)
                    : 0;
                return (
                  <li key={debtor.customerId} className="px-5 py-3.5 transition hover:bg-slate-50/70">
                    <Link href={`/customers/${debtor.customerId}`} className="block">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {debtor.name}
                          </p>
                          {debtor.company ? (
                            <p className="truncate text-xs text-slate-400">{debtor.company}</p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-end">
                          <p className="text-sm font-bold text-red-600">
                            {formatCurrency(debtor.remaining, debtor.currency)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            מתוך {formatCurrency(debtor.totalDue, debtor.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-500"
                          style={{ width: `${paidPercent}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">תשלומים אחרונים</h3>
              <p className="mt-0.5 text-xs text-slate-500">5 התשלומים האחרונים שנקלטו</p>
            </div>
            <Link
              href="/collections"
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              לכל התשלומים
            </Link>
          </div>

          {stats.recentPayments.length === 0 ? (
            <EmptyState text="עוד לא נרשמו תשלומים" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.recentPayments.map((payment) => (
                <li key={payment.paymentId} className="transition hover:bg-slate-50/70">
                  <Link
                    href={`/customers/${payment.customerId}`}
                    className="flex items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                        <CheckGlyph />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {payment.customerName}
                        </p>
                        <p className="text-xs text-slate-400">{formatDate(payment.paidAt)}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-emerald-600">
                      +{formatCurrency(payment.amount, payment.currency)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function getGreeting(now: Date, userName?: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Jerusalem",
    }).format(now),
  );
  let base: string;
  if (hour >= 5 && hour < 12) base = "בוקר טוב";
  else if (hour >= 12 && hour < 17) base = "צהריים טובים";
  else if (hour >= 17 && hour < 21) base = "ערב טוב";
  else base = "לילה טוב";

  return userName ? `${base} ${userName}` : base;
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-blue-200">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
    </div>
  );
}

const ACCENT_CLASSES = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  red: "bg-red-50 text-red-600 ring-red-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
} as const;

function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent: keyof typeof ACCENT_CLASSES;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${ACCENT_CLASSES[accent]}`}
        >
          {icon}
        </span>
      </div>
    </Link>
  );
}

const INSIGHT_TONE_CLASSES = {
  positive: {
    wrapper: "border-emerald-200/70 bg-gradient-to-l from-emerald-50/80 to-white",
    icon: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    wrapper: "border-amber-200/70 bg-gradient-to-l from-amber-50/80 to-white",
    icon: "bg-amber-100 text-amber-700",
  },
  info: {
    wrapper: "border-blue-200/70 bg-gradient-to-l from-blue-50/80 to-white",
    icon: "bg-blue-100 text-blue-700",
  },
} as const;

function InsightCard({ insight }: { insight: Insight }) {
  const tone = INSIGHT_TONE_CLASSES[insight.tone];
  return (
    <div className={`flex items-start gap-3.5 rounded-2xl border p-4 shadow-sm ${tone.wrapper}`}>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}
      >
        {insight.tone === "positive" ? (
          <TrendUpGlyph />
        ) : insight.tone === "warning" ? (
          <AlertGlyph />
        ) : (
          <BulbGlyph />
        )}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{insight.text}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="px-5 py-12 text-center text-sm text-slate-400">{text}</p>;
}

function UsersGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.5 4.7a3.2 3.2 0 0 1 0 6.2" />
      <path d="M15 14.2c2.7.3 5 2.2 5 4.8" />
    </svg>
  );
}

function FolderGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function AlertGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.2" r="0.4" fill="currentColor" />
    </svg>
  );
}

function KeyGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9m2 0h-3v3" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function TrendUpGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 17 9.5 10.5l4 4L21 7" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

function BulbGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.5 10.9c.8.6 1.5 1.6 1.5 2.6v.5h4v-.5c0-1 .7-2 1.5-2.6A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

function SparkGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-amber-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5-2 2m-7 7-2 2m11 0-2-2m-7-7-2-2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
