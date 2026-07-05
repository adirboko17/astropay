"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createPayment, type PaymentFormData } from "@/app/customers/actions";
import { PaymentFormModal } from "@/components/customers/payment-form-modal";
import { PageHero } from "@/components/layout/page-hero";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentFormData>(EMPTY_PAYMENT);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allBalances = useMemo(() => {
    const map = new Map<string, CustomerBalance>();
    for (const customer of initialCustomers) {
      map.set(customer.id, computeCustomerBalance(customer, initialPayments, initialCharges));
    }
    return map;
  }, [initialCustomers, initialPayments, initialCharges]);

  const customersWithDue = useMemo(
    () => initialCustomers.filter((customer) => (allBalances.get(customer.id)?.totalDue ?? 0) > 0),
    [initialCustomers, allBalances],
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
    return initialCharges.filter((charge) => charge.customer_id === payingCustomer.id);
  }, [payingCustomer, initialCharges]);

  const sortedCustomers = useMemo(() => {
    if (sortKey === "status") {
      return sortCustomersByCollectionStatus(filtered, initialPayments, initialCharges);
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
  }, [filtered, sortKey, balances, initialPayments, initialCharges]);

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
      <PageHero
        title="גבייה"
        description="כמה כל לקוח שילם מתוך כמה, וכמה נשאר לגבות"
        accent="emerald"
        metrics={[
          { label: "סה״כ לגבייה", value: formatCurrency(totals.totalDue) },
          { label: "נגבה בפועל", value: formatCurrency(totals.totalPaid) },
          { label: "נותר לגבייה", value: formatCurrency(totals.remaining) },
        ]}
        progress={
          totals.totalDue > 0
            ? {
                percent: collectionPercent,
                label: "התקדמות גבייה",
                startLabel: `${formatCurrency(totals.totalPaid)} נגבו`,
                endLabel: `מתוך ${formatCurrency(totals.totalDue)}`,
              }
            : undefined
        }
      />

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

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">גבייה לפי לקוח</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filtered.length} לקוחות עם סכום לגבייה מוגדר
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="status">מיין: סטטוס</option>
              <option value="remaining">מיין: נותר לגבייה</option>
              <option value="totalDue">מיין: סה״כ לגבייה</option>
              <option value="totalPaid">מיין: שולם</option>
              <option value="name">מיין: שם</option>
            </select>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="חיפוש לקוח..."
              className="h-10 w-56 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr>
                {["לקוח", "סה״כ לגבייה", "שולם", "נותר לגבייה", "תשלום אחרון", "סטטוס", "פעולות"].map(
                  (column) => (
                    <th
                      key={column}
                      className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-3 text-start text-xs font-semibold tracking-wide text-slate-500 backdrop-blur"
                    >
                      {column}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {sortedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      {searchQuery.trim() ? "לא נמצאו תוצאות לחיפוש" : "אין ללקוחות סכום לגבייה מוגדר"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      הגדר &quot;סכום כולל לגבייה&quot; בעמוד הלקוח כדי שהוא יופיע כאן
                    </p>
                  </td>
                </tr>
              ) : (
                sortedCustomers.map((customer, index) => {
                  const balance = balances.get(customer.id);
                  if (!balance) return null;
                  const status = getCollectionStatus(balance);

                  return (
                    <tr
                      key={customer.id}
                      className={`transition hover:bg-blue-50/40 ${
                        index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      <td className="border-b border-slate-100 px-4 py-3">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-medium text-blue-700 transition hover:text-blue-900 hover:underline"
                        >
                          {customer.name}
                        </Link>
                        {customer.company ? (
                          <p className="mt-0.5 text-xs text-slate-500">{customer.company}</p>
                        ) : null}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                        {formatCurrency(balance.totalDue, balance.currency)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-emerald-700">
                        {formatCurrency(balance.totalPaid, balance.currency)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-red-700">
                        {formatCurrency(balance.remaining, balance.currency)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
                        {formatDate(balance.lastPaymentAt)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${getCollectionStatusBadgeClass(status)}`}
                        >
                          {COLLECTION_STATUS_LABEL[status]}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openAddPayment(customer)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          + תשלום
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
