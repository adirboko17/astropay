"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createCustomer, createProject, deleteCustomer, updateCustomer } from "@/app/customers/actions";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import {
  computeCustomerBalance,
  formatCurrency,
  getCollectionStatus,
  getCollectionStatusBadgeClass,
  isBillingCustomer,
  sortCustomersByCollectionStatus,
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
  mode: "customers" | "projects";
  initialCustomers: Customer[];
  initialCredentials: Pick<ClientCredential, "client_id">[];
  initialPayments: CustomerPayment[];
  initialCharges: CustomerCharge[];
  initialRecurringClients: Pick<RecurringClient, "id" | "customer_id">[];
}

export function CustomersManager({
  mode,
  initialCustomers,
  initialCredentials,
  initialPayments,
  initialCharges,
  initialRecurringClients,
}: CustomersManagerProps) {
  const router = useRouter();
  const [customers, setCustomers] = useSyncedState(initialCustomers);
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

  const billingCustomers = useMemo(
    () =>
      sorted.filter((customer) =>
        isBillingCustomer(customer, initialPayments, initialCharges),
      ),
    [sorted, initialPayments, initialCharges],
  );

  const ownProjects = useMemo(
    () =>
      sorted.filter(
        (customer) => !isBillingCustomer(customer, initialPayments, initialCharges),
      ),
    [sorted, initialPayments, initialCharges],
  );

  const activeList = mode === "customers" ? billingCustomers : ownProjects;
  const filtered = useMemo(() => {
    const list = filterCustomers(activeList, searchQuery);
    if (mode === "customers") {
      return sortCustomersByCollectionStatus(list, initialPayments, initialCharges);
    }
    return list;
  }, [activeList, searchQuery, mode, initialPayments, initialCharges]);

  const isCustomersMode = mode === "customers";
  const activeCount = activeList.filter((customer) => customer.status === "active").length;
  const linkedPayPlusCount = activeList.filter((customer) =>
    initialRecurringClients.some((recurring) => recurring.customer_id === customer.id),
  ).length;
  const totalCredentials = activeList.reduce(
    (sum, customer) =>
      sum + countCredentialsForCustomer(initialCredentials, customer.id),
    0,
  );
  const rowGridClass = isCustomersMode
    ? "grid-cols-[minmax(250px,1fr)_220px_105px_185px_180px_48px]"
    : "grid-cols-[minmax(280px,1fr)_230px_115px_190px_48px]";

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
      const createAction = isCustomersMode ? createCustomer : createProject;
      const result = await createAction(draft);
      if (result.error) {
        setError(result.error);
        return;
      }

      if ("customer" in result && result.customer) {
        setCustomers((current) => [...current, result.customer]);
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
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3 px-5 py-5 sm:px-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
            {isCustomersMode ? <CustomersIcon /> : <ProjectsIcon />}
          </span>
          <div>
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                isCustomersMode ? "text-blue-600" : "text-violet-600"
              }`}
            >
              {isCustomersMode ? "Customers" : "Projects"}
            </p>
            <h1 className="mt-0.5 text-xl font-bold text-slate-950 sm:text-2xl">
              {isCustomersMode ? "לקוחות" : "פרויקטים שלי"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isCustomersMode
                ? "ניהול לקוחות, גבייה ופרטי התחברות"
                : "פרויקטים ופרטי התחברות במקום אחד"}
            </p>
          </div>
        </div>

        <div className="grid border-t border-slate-100 sm:grid-cols-3">
          <HeaderMetric
            label={isCustomersMode ? "לקוחות עם גבייה" : "סה״כ פרויקטים"}
            value={String(activeList.length)}
          />
          <HeaderMetric label="פעילים" value={String(activeCount)} tone="success" />
          <HeaderMetric
            label={isCustomersMode ? "מחוברים ל-PayPlus" : "פרטי התחברות"}
            value={String(isCustomersMode ? linkedPayPlusCount : totalCredentials)}
            tone={isCustomersMode ? "violet" : "default"}
          />
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
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  isCustomersMode
                    ? "bg-blue-50 text-blue-600"
                    : "bg-violet-50 text-violet-600"
                }`}
              >
                {isCustomersMode ? <CustomersIcon /> : <ProjectsIcon />}
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {isCustomersMode ? "רשימת לקוחות" : "רשימת פרויקטים"}
                </h2>
                <p className="text-xs text-slate-400">
                  מציג {filtered.length} מתוך {activeList.length}
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
                placeholder="חיפוש לפי שם, אימייל, טלפון..."
                  className={`h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pe-10 ps-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                    isCustomersMode
                      ? "focus:border-blue-300 focus:ring-blue-100"
                      : "focus:border-violet-300 focus:ring-violet-100"
                  }`}
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
              <button
                type="button"
                onClick={openCreate}
                className={`inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition ${
                  isCustomersMode
                    ? "bg-slate-950 hover:bg-slate-800"
                    : "bg-violet-600 hover:bg-violet-700"
                }`}
              >
                <PlusIcon />
                {isCustomersMode ? "לקוח חדש" : "פרויקט חדש"}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto p-2">
          <div className={isCustomersMode ? "min-w-[1050px]" : "min-w-[900px]"}>
            <div className={`grid ${rowGridClass} items-center px-4 py-2.5 text-[11px] font-semibold text-slate-500`}>
              <span>{isCustomersMode ? "לקוח" : "פרויקט"}</span>
              <span>פרטי קשר</span>
              <span>סטטוס</span>
              <span>פרטי התחברות</span>
              {isCustomersMode ? <span>גבייה</span> : null}
              <span />
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-600">
                  {searchQuery.trim()
                    ? "לא נמצאו תוצאות לחיפוש"
                    : isCustomersMode
                      ? "אין לקוחות עם סכום גבייה"
                      : "אין פרויקטים עדיין"}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {searchQuery.trim()
                    ? "נסה חיפוש אחר"
                    : isCustomersMode
                      ? "צור לקוח חדש כדי להתחיל"
                      : "צור פרויקט חדש כדי להתחיל"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((customer) => {
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
                    <article
                      key={customer.id}
                      className={`grid min-h-[68px] ${rowGridClass} items-center rounded-xl border border-slate-100 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.045)] transition hover:border-slate-200`}
                    >
                      <div className="flex min-w-0 items-center gap-3 px-4 py-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                            isCustomersMode
                              ? "bg-blue-50 text-blue-700"
                              : "bg-violet-50 text-violet-700"
                          }`}
                        >
                          {getInitials(customer.name)}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/customers/${customer.id}`}
                            className={`block truncate text-sm font-bold text-slate-900 transition ${
                              isCustomersMode ? "hover:text-blue-700" : "hover:text-violet-700"
                            }`}
                          >
                            {customer.name}
                          </Link>
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {customer.company || (isCustomersMode ? "לקוח" : "פרויקט")}
                          </p>
                        </div>
                      </div>
                      <div className="min-w-0 px-3 py-3 text-sm text-slate-600">
                        <p className="truncate">{customer.email || "—"}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{customer.phone || ""}</p>
                      </div>
                      <div className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${getCustomerStatusBadgeClass(customer.status)}`}
                        >
                          {getCustomerStatusLabel(customer.status)}
                        </span>
                      </div>
                      <div className="px-3 py-3 text-sm text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {credentialsCount} רשומות
                        </span>
                        {hasRecurring ? (
                          <span className="ms-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                            PayPlus
                          </span>
                        ) : null}
                      </div>
                      {isCustomersMode ? (
                        <div className="px-3 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium ${getCollectionStatusBadgeClass(status)}`}
                            >
                              {COLLECTION_STATUS_LABEL[status]}
                            </span>
                            <p className="text-xs font-semibold tabular-nums text-slate-600">
                              {formatCurrency(balance.totalPaid, balance.currency)} /{" "}
                              {formatCurrency(balance.totalDue, balance.currency)}
                            </p>
                          </div>
                        </div>
                      ) : null}
                      <div className="flex justify-center px-1 py-3">
                        <TableRowActionsMenu
                          disabled={deletingId === customer.id}
                          isDeleting={deletingId === customer.id}
                          onEdit={() => openEdit(customer)}
                          onDelete={() => handleDelete(customer)}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
              )}
          </div>
        </div>
      </section>

      {createOpen ? (
        <CustomerFormModal
          mode="create"
          variant={isCustomersMode ? "customer" : "project"}
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
          variant={isCustomersMode ? "customer" : "project"}
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

function HeaderMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "violet";
}) {
  const valueColor = {
    default: "text-slate-950",
    success: "text-emerald-600",
    violet: "text-violet-600",
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
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

function ProjectsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-5l-2-2H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1Z" />
    </svg>
  );
}
