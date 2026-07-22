"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createPayment, type PaymentFormData } from "@/app/customers/actions";
import { PaymentFormModal } from "@/components/customers/payment-form-modal";
import {
  computeCustomerBalance,
  computeTotals,
  formatCurrency,
  formatDate,
  getCollectionStatus,
  getCollectionStatusBadgeClass,
  COLLECTION_STATUS_LABEL,
  sortCustomersByCollectionStatus,
  type CustomerBalance,
} from "@/lib/customers/billing";
import { filterCustomers, sortCustomers } from "@/lib/customers/customers";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import type { Customer, CustomerCharge, CustomerPayment } from "@/types/database";

interface CollectionsManagerProps {
  initialCustomers: Customer[];
  initialPayments: CustomerPayment[];
  initialCharges: CustomerCharge[];
}

const EMPTY_PAYMENT: PaymentFormData = {
  amount: "",
  currency: "ILS",
  paid_at: new Date().toISOString().slice(0, 10),
  method: "",
  note: "",
  charge_id: "",
};

type SortKey = "status" | "remaining" | "totalDue" | "totalPaid" | "name";

export function CollectionsManager({
  initialCustomers,
  initialPayments,
  initialCharges,
}: CollectionsManagerProps) {
  const router = useRouter();
  const [customers] = useSyncedState(initialCustomers);
  const [payments, setPayments] = useSyncedState(initialPayments);
  const [charges] = useSyncedState(initialCharges);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentFormData>(EMPTY_PAYMENT);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allBalances = useMemo(() => {
    const map = new Map<string, CustomerBalance>();
    for (const customer of customers) {
      map.set(customer.id, computeCustomerBalance(customer, payments, charges));
    }
    return map;
  }, [customers, payments, charges]);

  const customersWithDue = useMemo(
    () => customers.filter((customer) => (allBalances.get(customer.id)?.totalDue ?? 0) > 0),
    [customers, allBalances],
  );

  const filtered = useMemo(
    () => filterCustomers(sortCustomers(customersWithDue), searchQuery),
    [customersWithDue, searchQuery],
  );

  const balances = useMemo(() => {
    const map = new Map<string, CustomerBalance>();
    for (const customer of filtered) {
      map.set(customer.id, allBalances.get(customer.id)!);
    }
    return map;
  }, [filtered, allBalances]);

  const customerCharges = useMemo(() => {
    if (!payingCustomer) return [];
    return charges.filter((charge) => charge.customer_id === payingCustomer.id);
  }, [payingCustomer, charges]);

  const sortedCustomers = useMemo(() => {
    if (sortKey === "status") {
      return sortCustomersByCollectionStatus(filtered, payments, charges);
    }

    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "he");
      const balanceA = balances.get(a.id);
      const balanceB = balances.get(b.id);
      if (!balanceA || !balanceB) return 0;

      if (sortKey === "remaining") return balanceB.remaining - balanceA.remaining;
      if (sortKey === "totalDue") return balanceB.totalDue - balanceA.totalDue;
      return balanceB.totalPaid - balanceA.totalPaid;
    });
  }, [filtered, sortKey, balances, payments, charges]);

  const totals = useMemo(
    () => computeTotals(Array.from(balances.values())),
    [balances],
  );

  function openAddPayment(customer: Customer) {
    setPayingCustomer(customer);
    setPaymentDraft({ ...EMPTY_PAYMENT, currency: customer.currency || "ILS" });
    setMessage(null);
    setError(null);
  }

  async function handleSavePayment() {
    if (!payingCustomer || isSaving) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await createPayment(payingCustomer.id, paymentDraft);
      if (result.error) {
        setError(result.error);
        return;
      }

      if ("payment" in result && result.payment) {
        const created = result.payment as CustomerPayment;
        setPayments((current) => [created, ...current]);
      }

      setPayingCustomer(null);
      setMessage(`תשלום נרשם עבור "${payingCustomer.name}"`);
      router.refresh();
    } catch {
      setError("שגיאה בלתי צפויה בשמירת התשלום");
    } finally {
      setIsSaving(false);
    }
  }

  const collectionPercent = totals.totalDue > 0 ? (totals.totalPaid / totals.totalDue) * 100 : 0;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3 px-5 py-5 sm:px-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
            <CollectionIcon />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">
              Collections
            </p>
            <h1 className="mt-0.5 text-xl font-bold text-slate-950 sm:text-2xl">גבייה</h1>
            <p className="mt-1 text-sm text-slate-500">תמונת מצב של תשלומים ויתרות לקוחות</p>
          </div>
        </div>

        <div className="grid border-t border-slate-100 sm:grid-cols-[1fr_1fr_1fr_1.35fr]">
          <CollectionMetric label="סה״כ לגבייה" value={formatCurrency(totals.totalDue)} />
          <CollectionMetric
            label="נגבה בפועל"
            value={formatCurrency(totals.totalPaid)}
            tone="success"
          />
          <CollectionMetric
            label="נותר לגבייה"
            value={formatCurrency(totals.remaining)}
            tone={totals.remaining > 0 ? "danger" : "success"}
          />
          <div className="border-t border-slate-100 px-5 py-4 sm:border-s sm:border-t-0 sm:px-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">התקדמות גבייה</p>
              <span className="text-sm font-bold tabular-nums text-emerald-600">
                {Math.round(collectionPercent)}%
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(collectionPercent, 100))}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {formatCurrency(totals.totalPaid)} מתוך {formatCurrency(totals.totalDue)}
            </p>
          </div>
        </div>
      </section>

      {(message || error) && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
            error
              ? "border border-red-200/80 bg-red-50 text-red-700"
              : "border border-emerald-200/80 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="relative z-20 border-b border-slate-100 p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CustomersIcon />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">גבייה לפי לקוח</h2>
                <p className="text-xs text-slate-400">
                  {filtered.length} לקוחות עם סכום לגבייה
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row xl:max-w-2xl">
              <div className="relative min-w-0 flex-1">
                <SearchIcon />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="חיפוש לפי שם לקוח או חברה..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pe-10 ps-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="נקה חיפוש"
                    className="absolute end-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  >
                    <ClearIcon />
                  </button>
                ) : null}
              </div>

              <label className="relative sm:w-56">
                <span className="pointer-events-none absolute start-3 top-1.5 text-[10px] font-medium text-slate-400">
                  מיון הרשימה
                </span>
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pb-1 pe-9 ps-3 pt-4 text-sm font-semibold text-slate-800 outline-none transition hover:border-emerald-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="status">לפי סטטוס</option>
                  <option value="remaining">לפי נותר לגבייה</option>
                  <option value="totalDue">לפי סה״כ לגבייה</option>
                  <option value="totalPaid">לפי סכום ששולם</option>
                  <option value="name">לפי שם</option>
                </select>
                <ChevronDownIcon />
              </label>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto p-2">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[minmax(260px,1fr)_130px_125px_135px_125px_120px_92px] items-center px-4 py-2.5 text-[11px] font-semibold text-slate-500">
              <span>לקוח</span>
              <span>סה״כ לגבייה</span>
              <span>שולם</span>
              <span>נותר לגבייה</span>
              <span>תשלום אחרון</span>
              <span>סטטוס</span>
              <span />
            </div>

            {sortedCustomers.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-600">
                  {searchQuery.trim() ? "לא נמצאו תוצאות לחיפוש" : "אין ללקוחות סכום לגבייה מוגדר"}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  הגדר סכום לגבייה בעמוד הלקוח כדי שיופיע כאן
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedCustomers.map((customer) => {
                  const balance = balances.get(customer.id);
                  if (!balance) return null;
                  const status = getCollectionStatus(balance);

                  return (
                    <article
                      key={customer.id}
                      className="grid min-h-[68px] grid-cols-[minmax(260px,1fr)_130px_125px_135px_125px_120px_92px] items-center rounded-xl border border-slate-100 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.045)] transition hover:border-slate-200"
                    >
                      <div className="flex min-w-0 items-center gap-3 px-4 py-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">
                          {getInitials(customer.name)}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="block truncate text-sm font-bold text-slate-900 transition hover:text-emerald-700"
                          >
                            {customer.name}
                          </Link>
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {customer.company || customer.email || "לקוח"}
                          </p>
                        </div>
                      </div>
                      <ValueCell value={formatCurrency(balance.totalDue, balance.currency)} />
                      <ValueCell
                        value={formatCurrency(balance.totalPaid, balance.currency)}
                        tone="success"
                      />
                      <ValueCell
                        value={formatCurrency(balance.remaining, balance.currency)}
                        tone={balance.remaining > 0 ? "danger" : "default"}
                      />
                      <div className="px-3 py-3 text-sm tabular-nums text-slate-500">
                        {formatDate(balance.lastPaymentAt)}
                      </div>
                      <div className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${getCollectionStatusBadgeClass(status)}`}
                        >
                          {COLLECTION_STATUS_LABEL[status]}
                        </span>
                      </div>
                      <div className="flex justify-center px-2 py-3">
                        <button
                          type="button"
                          onClick={() => openAddPayment(customer)}
                          className="h-8 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          + תשלום
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {payingCustomer ? (
        <PaymentFormModal
          mode="create"
          draft={paymentDraft}
          charges={customerCharges}
          isSaving={isSaving}
          onChange={(field, value) => setPaymentDraft((current) => ({ ...current, [field]: value }))}
          onClose={() => {
            if (isSaving) return;
            setPayingCustomer(null);
          }}
          onSave={handleSavePayment}
        />
      ) : null}
    </div>
  );
}

function CollectionMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const valueColor = {
    default: "text-slate-950",
    success: "text-emerald-600",
    danger: "text-rose-600",
  }[tone];

  return (
    <div className="border-t border-slate-100 px-5 py-4 first:border-t-0 sm:border-s sm:border-t-0 sm:px-6 sm:first:border-s-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}

function ValueCell({
  value,
  tone = "default",
}: {
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const textColor = {
    default: "text-slate-700",
    success: "text-emerald-600",
    danger: "text-rose-600",
  }[tone];

  return (
    <div className={`px-3 py-3 text-sm font-semibold tabular-nums ${textColor}`}>
      {value}
    </div>
  );
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

function CollectionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M16 14h2" strokeLinecap="round" />
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
