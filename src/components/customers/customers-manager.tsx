"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createCustomer, deleteCustomer, updateCustomer } from "@/app/customers/actions";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import {
  computeCustomerBalance,
  formatCurrency,
  getCollectionStatus,
  getCollectionStatusBadgeClass,
  COLLECTION_STATUS_LABEL,
} from "@/lib/customers/billing";
import {
  customerToFormData,
  EMPTY_CUSTOMER,
  getCustomerStatusBadgeClass,
  getCustomerStatusLabel,
  type CustomerFormData,
} from "@/lib/customers/constants";
import { countCredentialsForCustomer, filterCustomers, sortCustomers } from "@/lib/customers/customers";
import type {
  ClientCredential,
  Customer,
  CustomerCharge,
  CustomerPayment,
  RecurringClient,
} from "@/types/database";

interface CustomersManagerProps {
  initialCustomers: Customer[];
  initialCredentials: Pick<ClientCredential, "client_id">[];
  initialPayments: CustomerPayment[];
  initialCharges: CustomerCharge[];
  initialRecurringClients: Pick<RecurringClient, "id" | "customer_id">[];
}

export function CustomersManager({
  initialCustomers,
  initialCredentials,
  initialPayments,
  initialCharges,
  initialRecurringClients,
}: CustomersManagerProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<CustomerFormData>(EMPTY_CUSTOMER);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editDraft, setEditDraft] = useState<CustomerFormData>(EMPTY_CUSTOMER);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => sortCustomers(customers), [customers]);
  const filtered = useMemo(() => filterCustomers(sorted, searchQuery), [sorted, searchQuery]);

  function openCreate() {
    setDraft(EMPTY_CUSTOMER);
    setCreateOpen(true);
    setMessage(null);
    setError(null);
  }

  function closeCreate() {
    if (isSaving) return;
    setCreateOpen(false);
  }

  async function handleCreate() {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await createCustomer(draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCreateOpen(false);
      setMessage(`"${draft.name}" נוסף בהצלחה`);
      router.refresh();
    } catch {
      setError("שגיאה בלתי צפויה בהוספת הלקוח");
    } finally {
      setIsSaving(false);
    }
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setEditDraft(customerToFormData(customer));
    setMessage(null);
    setError(null);
  }

  async function handleUpdate() {
    if (!editingCustomer || isSaving) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await updateCustomer(editingCustomer.id, editDraft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === editingCustomer.id
            ? {
                ...customer,
                name: editDraft.name.trim(),
                email: editDraft.email.trim() || null,
                phone: editDraft.phone.trim() || null,
                company: editDraft.company.trim() || null,
                status: editDraft.status,
                notes: editDraft.notes.trim() || null,
                total_amount_due: Number.parseFloat(editDraft.total_amount_due) || 0,
                currency: editDraft.currency,
              }
            : customer,
        ),
      );
      setEditingCustomer(null);
      setMessage("פרטי הלקוח עודכנו");
      router.refresh();
    } catch {
      setError("שגיאה בלתי צפויה בעדכון הלקוח");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(customer: Customer) {
    if (!window.confirm(`למחוק את "${customer.name}"? פעולה זו תמחק גם את פרטי ההתחברות והתשלומים המקושרים.`)) {
      return;
    }

    setDeletingId(customer.id);
    setMessage(null);
    setError(null);

    try {
      const result = await deleteCustomer(customer.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCustomers((current) => current.filter((item) => item.id !== customer.id));
      setMessage(`"${customer.name}" נמחק`);
      router.refresh();
    } catch {
      setError("שגיאה בלתי צפויה במחיקת הלקוח");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
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
            <h2 className="text-base font-semibold text-slate-900">לקוחות</h2>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery.trim()
                ? `${filtered.length} מתוך ${customers.length} לקוחות`
                : `${customers.length} לקוחות`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="חיפוש לפי שם, אימייל, טלפון..."
                className="h-10 w-64 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="h-10 shrink-0 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              + לקוח חדש
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr>
                {["לקוח", "פרטי קשר", "סטטוס", "פרטי התחברות", "גבייה", "פעולות"].map(
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      {searchQuery.trim() ? "לא נמצאו תוצאות לחיפוש" : "אין לקוחות עדיין"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {searchQuery.trim() ? "נסה חיפוש אחר" : 'לחץ על "+ לקוח חדש" כדי להתחיל'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((customer, index) => {
                  const balance = computeCustomerBalance(customer, initialPayments, initialCharges);
                  const status = getCollectionStatus(balance);
                  const credentialsCount = countCredentialsForCustomer(
                    initialCredentials,
                    customer.id,
                  );
                  const hasRecurring = initialRecurringClients.some(
                    (recurring) => recurring.customer_id === customer.id,
                  );

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
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                        <p>{customer.email || "—"}</p>
                        <p className="text-slate-400">{customer.phone || ""}</p>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${getCustomerStatusBadgeClass(customer.status)}`}
                        >
                          {getCustomerStatusLabel(customer.status)}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {credentialsCount} רשומות
                        </span>
                        {hasRecurring ? (
                          <span className="ms-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                            PayPlus
                          </span>
                        ) : null}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm">
                        {balance.totalDue > 0 ? (
                          <div className="space-y-1">
                            <span
                              className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium ${getCollectionStatusBadgeClass(status)}`}
                            >
                              {COLLECTION_STATUS_LABEL[status]}
                            </span>
                            <p className="text-slate-600">
                              {formatCurrency(balance.totalPaid, balance.currency)} /{" "}
                              {formatCurrency(balance.totalDue, balance.currency)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(customer)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            ערוך
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === customer.id}
                            onClick={() => handleDelete(customer)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === customer.id ? "מוחק..." : "מחק"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {createOpen ? (
        <CustomerFormModal
          mode="create"
          draft={draft}
          isSaving={isSaving}
          onChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))}
          onClose={closeCreate}
          onSave={handleCreate}
        />
      ) : null}

      {editingCustomer ? (
        <CustomerFormModal
          mode="edit"
          draft={editDraft}
          isSaving={isSaving}
          onChange={(field, value) => setEditDraft((current) => ({ ...current, [field]: value }))}
          onClose={() => {
            if (isSaving) return;
            setEditingCustomer(null);
          }}
          onSave={handleUpdate}
        />
      ) : null}
    </div>
  );
}
