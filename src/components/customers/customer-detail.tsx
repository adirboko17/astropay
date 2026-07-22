"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createCharge,
  createPayment,
  deleteCharge,
  deletePayment,
  linkRecurringClient,
  unlinkRecurringClient,
  updateCharge,
  updateCustomer,
  updatePayment,
  type ChargeFormData,
  type PaymentFormData,
} from "@/app/customers/actions";
import {
  createCredential,
  deleteCredential,
  updateCredential,
} from "@/app/credentials/actions";
import { ChargeFormModal } from "@/components/customers/charge-form-modal";
import { CustomerCredentialModal } from "@/components/customers/customer-credential-modal";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { PaymentFormModal } from "@/components/customers/payment-form-modal";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import {
  computeChargeBalance,
  computeCustomerBalance,
  formatCurrency,
  formatDate,
  getCollectionStatus,
  getCollectionStatusBadgeClass,
  isBillingCustomer,
  COLLECTION_STATUS_LABEL,
} from "@/lib/customers/billing";
import {
  customerToFormData,
  getCustomerStatusBadgeClass,
  getCustomerStatusLabel,
  type CustomerFormData,
} from "@/lib/customers/constants";
import {
  credentialToFormData,
  EMPTY_CREDENTIAL,
  type CredentialFormData,
} from "@/lib/credentials/constants";
import type { PayPlusRecurringDetailView } from "@/lib/payplus/types";
import { countEnvVariables, isEnvTable } from "@/lib/credentials/env-table";
import { getPlatformBadgeClass } from "@/lib/credentials/platform-ui";
import { getTableName } from "@/lib/credentials/tables";
import type {
  ClientCredential,
  Customer,
  CredentialTable,
  CustomerCharge,
  CustomerPayment,
  RecurringClient,
} from "@/types/database";

const EMPTY_PAYMENT: PaymentFormData = {
  amount: "",
  currency: "ILS",
  paid_at: new Date().toISOString().slice(0, 10),
  method: "",
  note: "",
  charge_id: "",
};

const EMPTY_CHARGE: ChargeFormData = {
  title: "",
  amount: "",
  currency: "ILS",
  notes: "",
};

interface CustomerDetailProps {
  customer: Customer;
  initialCredentials: ClientCredential[];
  tables: CredentialTable[];
  initialPayments: CustomerPayment[];
  initialCharges: CustomerCharge[];
  linkedRecurringClient: RecurringClient | null;
  linkedRecurringDetail: PayPlusRecurringDetailView | null;
  unlinkedRecurringClients: RecurringClient[];
}

export function CustomerDetail({
  customer: initialCustomer,
  initialCredentials,
  tables,
  initialPayments,
  initialCharges,
  linkedRecurringClient,
  linkedRecurringDetail,
  unlinkedRecurringClients,
}: CustomerDetailProps) {
  const router = useRouter();
  const [customer, setCustomer] = useSyncedState(initialCustomer);
  const [credentials, setCredentials] = useSyncedState(initialCredentials);
  const [payments, setPayments] = useSyncedState(initialPayments);
  const [charges, setCharges] = useSyncedState(initialCharges);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CustomerFormData>(
    customerToFormData(customer),
  );

  const [credentialModalMode, setCredentialModalMode] = useState<"create" | "edit" | null>(null);
  const [credentialDraft, setCredentialDraft] = useState<CredentialFormData>(EMPTY_CREDENTIAL);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [editingCredentialTableId, setEditingCredentialTableId] = useState<string | null>(null);

  const [paymentModalMode, setPaymentModalMode] = useState<"create" | "edit" | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentFormData>(EMPTY_PAYMENT);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const [chargeModalMode, setChargeModalMode] = useState<"create" | "edit" | null>(null);
  const [chargeDraft, setChargeDraft] = useState<ChargeFormData>(EMPTY_CHARGE);
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null);

  const [selectedRecurringId, setSelectedRecurringId] = useState<string>(
    unlinkedRecurringClients[0]?.id ?? "",
  );
  const [activeSection, setActiveSection] = useState<"credentials" | "billing" | "payplus">(
    "credentials",
  );
  const [showAllCharges, setShowAllCharges] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [showPayPlusHistory, setShowPayPlusHistory] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payPlusPaidThisMonth = useMemo(() => {
    if (!linkedRecurringDetail) return 0;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    return linkedRecurringDetail.charges
      .filter((charge) => {
        const date = charge.executionDate ?? charge.chargeDate;
        return charge.isSuccess && date?.slice(0, 7) === monthKey;
      })
      .reduce((sum, charge) => sum + charge.amount, 0);
  }, [linkedRecurringDetail]);

  const balance = useMemo(
    () => computeCustomerBalance(customer, payments, charges),
    [customer, payments, charges],
  );
  const status = getCollectionStatus(balance);
  const isProject =
    !linkedRecurringClient && !isBillingCustomer(customer, payments, charges);

  const sortedCharges = useMemo(
    () => [...charges].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [charges],
  );

  const sortedCredentials = useMemo(
    () =>
      [...credentials].sort((a, b) => {
        const tableA = getTableName(a.table_id, tables) ?? a.platform;
        const tableB = getTableName(b.table_id, tables) ?? b.platform;
        return tableA.localeCompare(tableB, "he");
      }),
    [credentials, tables],
  );

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at)),
    [payments],
  );
  const visibleCharges = showAllCharges ? sortedCharges : sortedCharges.slice(0, 4);
  const visiblePayments = showAllPayments ? sortedPayments : sortedPayments.slice(0, 5);

  function notify(success: string | null, failure: string | null) {
    setMessage(success);
    setError(failure);
  }

  async function handleSaveProfile() {
    if (isSaving) return;
    setIsSaving(true);
    notify(null, null);

    try {
      const result = await updateCustomer(customer.id, profileDraft);
      if (result.error) {
        notify(null, result.error);
        return;
      }

      setCustomer((current) => ({
        ...current,
        name: profileDraft.name.trim(),
        email: profileDraft.email.trim() || null,
        phone: profileDraft.phone.trim() || null,
        company: profileDraft.company.trim() || null,
        status: profileDraft.status,
        notes: profileDraft.notes.trim() || null,
        total_amount_due: Number.parseFloat(profileDraft.total_amount_due) || 0,
        currency: profileDraft.currency,
      }));
      setEditingProfile(false);
      notify("פרטי הלקוח עודכנו", null);
      router.refresh();
    } catch {
      notify(null, "שגיאה בלתי צפויה בעדכון הלקוח");
    } finally {
      setIsSaving(false);
    }
  }

  function openAddCredential() {
    setCredentialDraft(EMPTY_CREDENTIAL);
    setEditingCredentialId(null);
    setEditingCredentialTableId(null);
    setCredentialModalMode("create");
    notify(null, null);
  }

  function openEditCredential(credential: ClientCredential) {
    setCredentialDraft(credentialToFormData(credential));
    setEditingCredentialId(credential.id);
    setEditingCredentialTableId(credential.table_id);
    setCredentialModalMode("edit");
    notify(null, null);
  }

  async function handleSaveCredential(tableId: string) {
    if (isSaving) return;
    setIsSaving(true);
    notify(null, null);

    try {
      const dataWithName = { ...credentialDraft, client_name: customer.name };

      if (credentialModalMode === "edit" && editingCredentialId) {
        const result = await updateCredential(
          editingCredentialId,
          dataWithName,
          editingCredentialTableId,
          customer.id,
        );
        if (result.error) {
          notify(null, result.error);
          return;
        }

        setCredentials((current) =>
          current.map((item) =>
            item.id === editingCredentialId
              ? {
                  ...item,
                  client_name: customer.name,
                  login_email: credentialDraft.login_email.trim() || null,
                  login_username: credentialDraft.login_username.trim() || null,
                  password: credentialDraft.password || null,
                  website_url: credentialDraft.website_url.trim() || null,
                  notes: credentialDraft.notes.trim() || null,
                  table_id: tableId,
                }
              : item,
          ),
        );
      } else {
        const result = await createCredential(dataWithName, tableId, customer.id);
        if (result.error) {
          notify(null, result.error);
          return;
        }

        if ("credential" in result && result.credential) {
          setCredentials((current) => [...current, result.credential]);
        }
      }

      setCredentialModalMode(null);
      notify("פרטי ההתחברות נשמרו", null);
      router.refresh();
    } catch {
      notify(null, "שגיאה בלתי צפויה בשמירת פרטי ההתחברות");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteCredential(credential: ClientCredential) {
    if (!window.confirm("למחוק את הרשומה?")) return;

    notify(null, null);
    try {
      const result = await deleteCredential(credential.id);
      if (result.error) {
        notify(null, result.error);
        return;
      }
      setCredentials((current) => current.filter((item) => item.id !== credential.id));
      notify("הרשומה נמחקה", null);
      router.refresh();
    } catch {
      notify(null, "שגיאה בלתי צפויה במחיקת הרשומה");
    }
  }

  function openAddCharge() {
    setChargeDraft({ ...EMPTY_CHARGE, currency: customer.currency || "ILS" });
    setEditingChargeId(null);
    setChargeModalMode("create");
    notify(null, null);
  }

  function openEditCharge(charge: CustomerCharge) {
    setChargeDraft({
      title: charge.title,
      amount: String(charge.amount),
      currency: charge.currency,
      notes: charge.notes ?? "",
    });
    setEditingChargeId(charge.id);
    setChargeModalMode("edit");
    notify(null, null);
  }

  async function handleSaveCharge() {
    if (isSaving) return;
    setIsSaving(true);
    notify(null, null);

    try {
      const result =
        chargeModalMode === "edit" && editingChargeId
          ? await updateCharge(editingChargeId, customer.id, chargeDraft)
          : await createCharge(customer.id, chargeDraft);

      if (result.error) {
        notify(null, result.error);
        return;
      }

      if (chargeModalMode === "edit" && editingChargeId) {
        setCharges((current) =>
          current.map((item) =>
            item.id === editingChargeId
              ? {
                  ...item,
                  title: chargeDraft.title.trim(),
                  amount: Number.parseFloat(chargeDraft.amount) || 0,
                  currency: chargeDraft.currency.trim() || "ILS",
                  notes: chargeDraft.notes.trim() || null,
                }
              : item,
          ),
        );
      } else if ("charge" in result && result.charge) {
        const created = result.charge as CustomerCharge;
        setCharges((current) => [created, ...current]);
      }

      setChargeModalMode(null);
      notify("החיוב נשמר", null);
      router.refresh();
    } catch {
      notify(null, "שגיאה בלתי צפויה בשמירת החיוב");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteCharge(charge: CustomerCharge) {
    if (!window.confirm(`למחוק את החיוב "${charge.title}"?`)) return;

    notify(null, null);
    try {
      const result = await deleteCharge(charge.id, customer.id);
      if (result.error) {
        notify(null, result.error);
        return;
      }
      setCharges((current) => current.filter((item) => item.id !== charge.id));
      notify("החיוב נמחק", null);
      router.refresh();
    } catch {
      notify(null, "שגיאה בלתי צפויה במחיקת החיוב");
    }
  }

  function openAddPayment() {
    setPaymentDraft({ ...EMPTY_PAYMENT, currency: customer.currency || "ILS" });
    setEditingPaymentId(null);
    setPaymentModalMode("create");
    notify(null, null);
  }

  function openEditPayment(payment: CustomerPayment) {
    setPaymentDraft({
      amount: String(payment.amount),
      currency: payment.currency,
      paid_at: payment.paid_at,
      method: payment.method ?? "",
      note: payment.note ?? "",
      charge_id: payment.charge_id ?? "",
    });
    setEditingPaymentId(payment.id);
    setPaymentModalMode("edit");
    notify(null, null);
  }

  async function handleSavePayment() {
    if (isSaving) return;
    setIsSaving(true);
    notify(null, null);

    try {
      const result =
        paymentModalMode === "edit" && editingPaymentId
          ? await updatePayment(editingPaymentId, customer.id, paymentDraft)
          : await createPayment(customer.id, paymentDraft);

      if (result.error) {
        notify(null, result.error);
        return;
      }

      if (paymentModalMode === "edit" && editingPaymentId) {
        setPayments((current) =>
          current.map((item) =>
            item.id === editingPaymentId
              ? {
                  ...item,
                  amount: Number.parseFloat(paymentDraft.amount) || 0,
                  currency: paymentDraft.currency.trim() || "ILS",
                  paid_at: paymentDraft.paid_at,
                  method: paymentDraft.method.trim() || null,
                  note: paymentDraft.note.trim() || null,
                  charge_id: paymentDraft.charge_id || null,
                }
              : item,
          ),
        );
      } else if ("payment" in result && result.payment) {
        const created = result.payment as CustomerPayment;
        setPayments((current) => [created, ...current]);
      }

      setPaymentModalMode(null);
      notify("התשלום נשמר", null);
      router.refresh();
    } catch {
      notify(null, "שגיאה בלתי צפויה בשמירת התשלום");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePayment(payment: CustomerPayment) {
    if (!window.confirm("למחוק את התשלום?")) return;

    notify(null, null);
    try {
      const result = await deletePayment(payment.id, customer.id);
      if (result.error) {
        notify(null, result.error);
        return;
      }
      setPayments((current) => current.filter((item) => item.id !== payment.id));
      notify("התשלום נמחק", null);
      router.refresh();
    } catch {
      notify(null, "שגיאה בלתי צפויה במחיקת התשלום");
    }
  }

  async function handleLinkRecurring() {
    if (!selectedRecurringId || isSaving) return;
    setIsSaving(true);
    notify(null, null);

    try {
      const result = await linkRecurringClient(customer.id, selectedRecurringId);
      if (result.error) {
        notify(null, result.error);
        return;
      }
      notify("הוראת הקבע קושרה ללקוח", null);
      router.refresh();
    } catch {
      notify(null, "שגיאה בלתי צפויה בקישור הוראת הקבע");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUnlinkRecurring() {
    if (!linkedRecurringClient || isSaving) return;
    setIsSaving(true);
    notify(null, null);

    try {
      const result = await unlinkRecurringClient(customer.id, linkedRecurringClient.id);
      if (result.error) {
        notify(null, result.error);
        return;
      }
      notify("קישור הוראת הקבע בוטל", null);
      router.refresh();
    } catch {
      notify(null, "שגיאה בלתי צפויה בביטול הקישור");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link
        href={isProject ? "/projects" : "/customers"}
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        {isProject ? "← חזור לכל הפרויקטים" : "← חזור לכל הלקוחות"}
      </Link>

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
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-l from-blue-50 via-white to-white px-6 py-6">
          <div className="absolute -start-8 -top-8 h-32 w-32 rounded-full bg-blue-100/60 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-lg shadow-blue-600/20">
                {customer.name.charAt(0).toUpperCase() || "?"}
              </span>
              <div>
                <p className="text-xs font-semibold text-blue-600">
                  {isProject ? "כרטיס פרויקט" : "כרטיס לקוח"}
                </p>
                <h1 className="mt-1 text-xl font-semibold text-slate-900">{customer.name}</h1>
                {customer.company ? (
                  <p className="mt-0.5 text-sm text-slate-500">{customer.company}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getCustomerStatusBadgeClass(customer.status)}`}
                  >
                    {getCustomerStatusLabel(customer.status)}
                  </span>
                  {customer.email ? (
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      {customer.email}
                    </span>
                  ) : null}
                  {customer.phone ? (
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      {customer.phone}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setProfileDraft(customerToFormData(customer));
                setEditingProfile(true);
              }}
              className="rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white"
            >
              {isProject ? "ערוך פרטי פרויקט" : "ערוך פרטי לקוח"}
            </button>
          </div>
          {customer.notes ? (
            <p className="relative mt-4 max-w-2xl rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-100">
              {customer.notes}
            </p>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-x-reverse sm:divide-y-0 lg:grid-cols-4">
          <div className="px-5 py-4">
            <p className="text-xs font-medium text-slate-500">פרטי התחברות</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{credentials.length}</p>
            <p className="mt-0.5 text-xs text-slate-400">רשומות מקושרות</p>
          </div>
          {!isProject ? (
            <>
              <div className="px-5 py-4">
                <p className="text-xs font-medium text-slate-500">נותר לגבייה</p>
                <p className={`mt-1 text-xl font-semibold ${balance.remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(balance.remaining, balance.currency)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{COLLECTION_STATUS_LABEL[status]}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-medium text-slate-500">חיובים ותשלומים</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {charges.length} <span className="text-sm font-normal text-slate-400">/</span> {payments.length}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">חיובים / תשלומים</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-medium text-slate-500">PayPlus</p>
                <p className={`mt-1 text-sm font-semibold ${linkedRecurringClient ? "text-indigo-700" : "text-slate-500"}`}>
                  {linkedRecurringClient ? "הוראת קבע מקושרת" : "לא מקושר"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {linkedRecurringClient
                    ? `${formatCurrency(Number(linkedRecurringClient.monthly_amount), linkedRecurringClient.currency)} לחודש`
                    : "ניתן לקשר הוראה קיימת"}
                </p>
              </div>
            </>
          ) : (
            <div className="px-5 py-4 sm:col-span-1 lg:col-span-3">
              <p className="text-xs font-medium text-slate-500">סוג רשומה</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">פרויקט פנימי</p>
              <p className="mt-1 text-xs text-slate-400">מידע פיננסי מוסתר בפרויקטים ללא גבייה</p>
            </div>
          )}
        </div>
      </section>

      {!isProject ? (
        <nav
          aria-label="אזורי כרטיס הלקוח"
          className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm"
        >
          {(
            [
              ["credentials", "פרטי התחברות", credentials.length],
              ["billing", "גבייה", charges.length + payments.length],
              ["payplus", "PayPlus", linkedRecurringClient ? 1 : 0],
            ] as const
          ).map(([section, label, count]) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              aria-current={activeSection === section ? "page" : undefined}
              className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeSection === section
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {label}
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  activeSection === section ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </nav>
      ) : null}

      {(isProject || activeSection === "credentials") && (
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">פרטי התחברות</h2>
              <p className="mt-1 text-sm text-slate-500">
                {credentials.length} רשומות מקושרות {isProject ? "לפרויקט" : "ללקוח"}
              </p>
            </div>
            <button
              type="button"
              onClick={openAddCredential}
              disabled={tables.length === 0}
              className="h-9 shrink-0 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              + הוסף
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {sortedCredentials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-600">אין פרטי התחברות מקושרים</p>
                <p className="mt-1 text-sm text-slate-400">
                  הוסף Supabase, אתר, או כל שירות אחר שקשור ללקוח זה
                </p>
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {sortedCredentials.map((credential) => {
                  const tableName = getTableName(credential.table_id, tables) ?? credential.platform;
                  return (
                    <CredentialCard
                      key={credential.id}
                      credential={credential}
                      tableName={tableName}
                      onEdit={() => openEditCredential(credential)}
                      onDelete={() => handleDeleteCredential(credential)}
                      onGoToTable={() => {
                        if (credential.table_id) router.push(`/credentials/${credential.table_id}`);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {!isProject && activeSection === "billing" && (
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">גבייה</h2>
                  <p className="mt-1 text-sm text-slate-500">חיובים, יתרות והיסטוריית תשלומים במקום אחד</p>
                </div>
                <button
                  type="button"
                  onClick={openAddPayment}
                  className="h-9 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  + רישום תשלום
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 text-center sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4">
                  <p className="text-xs text-slate-500">סה״כ לגבייה</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCurrency(balance.totalDue, balance.currency)}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-4">
                  <p className="text-xs text-emerald-700">שולם</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-800">
                    {formatCurrency(balance.totalPaid, balance.currency)}
                  </p>
                </div>
                <div className="rounded-2xl border border-red-100 bg-red-50 px-3 py-4">
                  <p className="text-xs text-red-700">נותר לגבייה</p>
                  <p className="mt-1 text-sm font-semibold text-red-700">
                    {formatCurrency(balance.remaining, balance.currency)}
                  </p>
                </div>
              </div>

              {linkedRecurringClient ? (
                <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-xs leading-5 text-indigo-800">
                  <span className="mt-0.5 shrink-0" aria-hidden="true">ⓘ</span>
                  <p>
                    הוראת הקבע ב-PayPlus מנוהלת בנפרד ואינה כלולה בסכומי הפרויקט,
                    בתשלומים או ביתרה לגבייה.
                  </p>
                </div>
              ) : null}

              {balance.totalDue > 0 ? (
                <span
                  className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${getCollectionStatusBadgeClass(status)}`}
                >
                  {COLLECTION_STATUS_LABEL[status]}
                </span>
              ) : (
                <p className="text-xs text-slate-400">
                  לא הוגדר סכום לגבייה — הוסף חיוב/שירות למטה או הגדר סכום כולל בפרטי הלקוח
                </p>
              )}

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">חיובים / שירותים</p>
                  <button
                    type="button"
                    onClick={openAddCharge}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    + הוסף חיוב
                  </button>
                </div>

                {sortedCharges.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3 text-center text-xs text-slate-400">
                    אין חיובים נפרדים — כל שירות שהלקוח לוקח יכול לקבל כאן סכום גבייה משלו
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {visibleCharges.map((charge) => {
                      const chargeBalance = computeChargeBalance(charge, payments);
                      return (
                        <div
                          key={charge.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{charge.title}</p>
                            <p className="text-xs text-slate-500">
                              {formatCurrency(chargeBalance.paid, chargeBalance.currency)} /{" "}
                              {formatCurrency(chargeBalance.amount, chargeBalance.currency)}
                              {chargeBalance.remaining > 0 ? (
                                <span className="text-red-600">
                                  {" "}
                                  · נותר {formatCurrency(chargeBalance.remaining, chargeBalance.currency)}
                                </span>
                              ) : (
                                <span className="text-emerald-600"> · שולם במלואו</span>
                              )}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => openEditCharge(charge)}
                              className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            >
                              ערוך
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCharge(charge)}
                              className="rounded-md px-2 py-1 text-[11px] font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700"
                            >
                              מחק
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {sortedCharges.length > 4 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllCharges((current) => !current)}
                    className="w-full rounded-lg py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    {showAllCharges ? "הצג פחות" : `הצג את כל ${sortedCharges.length} החיובים`}
                  </button>
                ) : null}
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">תשלומים אחרונים</p>
                    <p className="mt-0.5 text-xs text-slate-400">{payments.length} תשלומים רשומים</p>
                  </div>
                </div>
                {sortedPayments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
                    אין תשלומים רשומים עדיין
                  </p>
                ) : (
                  visiblePayments.map((payment) => {
                    const chargeTitle = charges.find((charge) => charge.id === payment.charge_id)?.title;
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {formatCurrency(Number(payment.amount), payment.currency)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(payment.paid_at)}
                            {payment.method ? ` · ${payment.method}` : ""}
                            {chargeTitle ? ` · ${chargeTitle}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditPayment(payment)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800"
                          >
                            ערוך
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(payment)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700"
                          >
                            מחק
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
                {sortedPayments.length > 5 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllPayments((current) => !current)}
                    className="w-full rounded-lg py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    {showAllPayments ? "הצג פחות" : `הצג את כל ${sortedPayments.length} התשלומים`}
                  </button>
                ) : null}
              </div>
            </div>
        </section>
      )}

      {!isProject && activeSection === "payplus" && (
          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">הוראת קבע PayPlus</h2>
              <p className="mt-1 text-sm text-slate-500">חיבור בין הלקוח לחיובים החודשיים ב-PayPlus</p>
            </div>

            <div className="p-5">
              {linkedRecurringClient ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-indigo-100 bg-gradient-to-l from-indigo-50 to-white p-5">
                    <p className="text-xs font-semibold text-indigo-600">הוראת קבע פעילה</p>
                    <p className="mt-2 text-2xl font-semibold text-indigo-950">
                      {formatCurrency(
                        Number(linkedRecurringClient.monthly_amount),
                        linkedRecurringClient.currency,
                      )}{" "}
                      / חודש
                    </p>
                    <p className="mt-2 text-sm text-indigo-700">
                      סטטוס: {linkedRecurringClient.recurring_status ?? "—"} · חיוב הבא:{" "}
                      {formatDate(linkedRecurringClient.next_billing_date)}
                    </p>
                    <p className="mt-4 border-t border-indigo-100 pt-3 text-sm font-medium text-indigo-800">
                      חויב בהצלחה החודש:{" "}
                      {formatCurrency(payPlusPaidThisMonth, linkedRecurringClient.currency)}
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowPayPlusHistory((current) => !current)}
                      aria-expanded={showPayPlusHistory}
                      className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3.5 text-right transition hover:bg-slate-50"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">
                          היסטוריית תשלומי PayPlus
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {linkedRecurringDetail
                            ? `${linkedRecurringDetail.charges.length} תשלומים וחיובים`
                            : "היסטוריית החיובים אינה זמינה כרגע"}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-indigo-700">
                        {showPayPlusHistory ? "הסתר היסטוריה" : "הצג היסטוריה"}
                        <span
                          className={`text-base transition ${showPayPlusHistory ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        >
                          ⌄
                        </span>
                      </span>
                    </button>
                    {showPayPlusHistory ? (
                      linkedRecurringDetail ? (
                        <PayPlusPaymentHistory detail={linkedRecurringDetail} />
                      ) : (
                        <p className="border-t border-slate-100 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                          לא ניתן לטעון את היסטוריית התשלומים מ־PayPlus כרגע
                        </p>
                      )
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleUnlinkRecurring}
                    className="h-10 w-full rounded-xl border border-slate-200 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    בטל קישור
                  </button>
                </div>
              ) : unlinkedRecurringClients.length === 0 ? (
                <p className="text-sm text-slate-400">
                  אין הוראות קבע מ-PayPlus שממתינות לקישור כרגע
                </p>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedRecurringId}
                    onChange={(event) => setSelectedRecurringId(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  >
                    {unlinkedRecurringClients.map((recurring) => (
                      <option key={recurring.id} value={recurring.id}>
                        {recurring.customer_name} —{" "}
                        {formatCurrency(Number(recurring.monthly_amount), recurring.currency)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isSaving || !selectedRecurringId}
                    onClick={handleLinkRecurring}
                    className="h-9 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    קשר הוראת קבע
                  </button>
                </div>
              )}
            </div>
          </section>
      )}

      {editingProfile ? (
        <CustomerFormModal
          mode="edit"
          variant={isProject ? "project" : "customer"}
          draft={profileDraft}
          isSaving={isSaving}
          hasCharges={charges.length > 0}
          onChange={(field, value) => setProfileDraft((current) => ({ ...current, [field]: value }))}
          onClose={() => {
            if (isSaving) return;
            setEditingProfile(false);
          }}
          onSave={handleSaveProfile}
        />
      ) : null}

      {credentialModalMode ? (
        <CustomerCredentialModal
          mode={credentialModalMode}
          tables={tables}
          initialTableId={editingCredentialTableId}
          draft={credentialDraft}
          isSaving={isSaving}
          onChange={(field, value) => setCredentialDraft((current) => ({ ...current, [field]: value }))}
          onClose={() => {
            if (isSaving) return;
            setCredentialModalMode(null);
          }}
          onSave={handleSaveCredential}
        />
      ) : null}

      {paymentModalMode ? (
        <PaymentFormModal
          mode={paymentModalMode}
          draft={paymentDraft}
          charges={charges}
          isSaving={isSaving}
          onChange={(field, value) => setPaymentDraft((current) => ({ ...current, [field]: value }))}
          onClose={() => {
            if (isSaving) return;
            setPaymentModalMode(null);
          }}
          onSave={handleSavePayment}
        />
      ) : null}

      {chargeModalMode ? (
        <ChargeFormModal
          mode={chargeModalMode}
          draft={chargeDraft}
          isSaving={isSaving}
          onChange={(field, value) => setChargeDraft((current) => ({ ...current, [field]: value }))}
          onClose={() => {
            if (isSaving) return;
            setChargeModalMode(null);
          }}
          onSave={handleSaveCharge}
        />
      ) : null}
    </div>
  );
}

function PayPlusPaymentHistory({
  detail,
}: {
  detail: PayPlusRecurringDetailView;
}) {
  const charges = [...detail.charges].sort((a, b) => {
    const dateA = a.executionDate ?? a.chargeDate ?? "";
    const dateB = b.executionDate ?? b.chargeDate ?? "";
    return dateB.localeCompare(dateA);
  });

  return (
    <div className="border-t border-slate-100 bg-slate-50/70 p-4">
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <PayPlusHistoryMetric
          label="נגבה בסך הכול"
          value={formatCurrency(detail.totalCollected, detail.client.currency)}
          tone="indigo"
        />
        <PayPlusHistoryMetric
          label="תשלומים שהצליחו"
          value={String(detail.successfulChargeCount)}
          tone="success"
        />
        <PayPlusHistoryMetric
          label="תשלומים שנכשלו"
          value={String(detail.failedChargeCount)}
          tone={detail.failedChargeCount > 0 ? "danger" : "neutral"}
        />
      </div>

      {detail.chargesError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          {detail.chargesError}
        </p>
      ) : charges.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-600">אין עדיין תשלומים להצגה</p>
          <p className="mt-1 text-xs text-slate-400">
            חיובים שיבוצעו דרך הוראת הקבע יופיעו כאן
          </p>
        </div>
      ) : (
        <div className="max-h-[520px] space-y-2 overflow-y-auto pe-1">
          {charges.map((charge) => {
            const chargeDate = charge.executionDate ?? charge.chargeDate;
            const statusClass = charge.isSuccess
              ? "bg-emerald-100 text-emerald-800"
              : charge.isFailed
                ? "bg-red-100 text-red-800"
                : charge.isPending
                  ? "bg-amber-100 text-amber-900"
                  : "bg-slate-100 text-slate-700";

            return (
              <article
                key={charge.uid}
                className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center"
              >
                <div>
                  <p className="text-xs text-slate-400">תאריך חיוב</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDate(chargeDate)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {charge.productSummary || "חיוב הוראת קבע"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {charge.cardLast4 ? `כרטיס המסתיים ב־${charge.cardLast4}` : "כרטיס לא זמין"}
                    {charge.transactionId ? ` · עסקה ${charge.transactionId}` : ""}
                  </p>
                  {charge.failureReason ? (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {charge.failureReason}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <p className="text-sm font-bold text-slate-950">
                    {formatCurrency(charge.amount, charge.currency)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}>
                      {charge.statusLabel}
                    </span>
                    {charge.invoiceUrl ? (
                      <a
                        href={charge.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-indigo-200 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-50"
                      >
                        חשבונית
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PayPlusHistoryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "indigo" | "success" | "danger" | "neutral";
}) {
  const styles = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-900",
    success: "border-emerald-100 bg-emerald-50 text-emerald-900",
    danger: "border-red-100 bg-red-50 text-red-900",
    neutral: "border-slate-200 bg-white text-slate-800",
  }[tone];

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${styles}`}>
      <p className="text-[11px] opacity-70">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function CredentialCard({
  credential,
  tableName,
  onEdit,
  onDelete,
  onGoToTable,
}: {
  credential: ClientCredential;
  tableName: string;
  onEdit: () => void;
  onDelete: () => void;
  onGoToTable: () => void;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const website = credential.website_url?.trim() ?? "";
  const dashboardUrl = credential.dashboard_url?.trim() ?? "";
  const isLink = website.startsWith("http://") || website.startsWith("https://");
  const isDashboardLink =
    dashboardUrl.startsWith("http://") || dashboardUrl.startsWith("https://");
  const isEnv = isEnvTable(tableName);
  const hasOnlyNotes =
    Boolean(credential.notes?.trim()) &&
    !credential.login_email &&
    !credential.login_username &&
    !credential.password &&
    !website &&
    !dashboardUrl &&
    !credential.service_label;
  const identity = isEnv
    ? `${countEnvVariables(credential.notes)} משתני סביבה`
    : credential.service_label ||
      credential.login_email ||
      credential.login_username ||
      website ||
      dashboardUrl ||
      (credential.password ? "סיסמה שמורה" : "") ||
      (hasOnlyNotes ? "הערות בלבד" : "ללא פרטים");

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm">
      <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${isExpanded ? "border-b border-slate-100" : ""}`}>
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-right"
        >
          <span
            className={`inline-flex shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${getPlatformBadgeClass(tableName)}`}
          >
            {tableName}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-slate-800">{identity}</span>
            <span className="mt-0.5 block text-xs text-slate-400">
              {isExpanded ? "לחץ לסגירת הפרטים" : "לחץ לצפייה בפרטים"}
            </span>
          </span>
          <span className={`ms-auto text-slate-400 transition ${isExpanded ? "rotate-180" : ""}`}>⌄</span>
        </button>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onGoToTable}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            לטבלה
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
          >
            ערוך
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50"
          >
            מחק
          </button>
        </div>
      </div>

      {isExpanded ? (
        isEnv ? (
          credential.notes?.trim() ? (
            <EnvContent content={credential.notes} />
          ) : (
            <p className="bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
              אין תוכן ENV ברשומה
            </p>
          )
        ) : (
          <dl className="grid gap-4 bg-slate-50/40 px-4 py-4 sm:grid-cols-2">
            {credential.service_label ? (
              <CredentialDetail label="שירות" value={credential.service_label} />
            ) : null}
            {credential.login_email ? (
              <CredentialDetail label="אימייל" value={credential.login_email} ltr />
            ) : null}
            {credential.login_username ? (
              <CredentialDetail label="משתמש" value={credential.login_username} ltr />
            ) : null}
            {website ? (
              <div>
                <dt className="text-xs font-medium text-slate-500">אתר</dt>
                <dd className="mt-1.5 break-all text-sm text-slate-800" dir="ltr">
                  {isLink ? (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {website}
                    </a>
                  ) : (
                    website
                  )}
                </dd>
              </div>
            ) : null}
            {dashboardUrl ? (
              <div>
                <dt className="text-xs font-medium text-slate-500">לוח בקרה</dt>
                <dd className="mt-1.5 break-all text-sm text-slate-800" dir="ltr">
                  {isDashboardLink ? (
                    <a
                      href={dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {dashboardUrl}
                    </a>
                  ) : (
                    dashboardUrl
                  )}
                </dd>
              </div>
            ) : null}
            {credential.password ? (
              <div>
                <dt className="text-xs font-medium text-slate-500">סיסמה</dt>
                <dd className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-800">
                <span className="rounded-lg bg-slate-50 px-2.5 py-1 font-mono text-sm">
                  {passwordVisible ? credential.password : "••••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setPasswordVisible((current) => !current)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  {passwordVisible ? "הסתר" : "הצג"}
                </button>
                <CopyTextButton value={credential.password} label="העתק" />
                </dd>
              </div>
            ) : null}
            {credential.notes?.trim() ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4 sm:col-span-2">
                <dt className="text-xs font-semibold text-amber-700">הערות</dt>
                <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                  {credential.notes}
                </dd>
              </div>
            ) : null}
          </dl>
        )
      ) : null}
    </article>
  );
}

function CredentialDetail({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd
        className="mt-1.5 break-words text-sm font-medium text-slate-800"
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function CopyTextButton({
  value,
  label,
  dark = false,
}: {
  value: string;
  label: string;
  dark?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
        copied
          ? "bg-emerald-100 text-emerald-700"
          : dark
            ? "bg-white/10 text-slate-200 hover:bg-white/15 hover:text-white"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      {copied ? "הועתק!" : label}
    </button>
  );
}

function EnvContent({ content }: { content: string }) {
  const variableCount = countEnvVariables(content);

  return (
    <div className="bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-emerald-400/10 px-2 py-1 font-mono text-xs font-bold text-emerald-300">
            .env
          </span>
          <span className="text-xs text-slate-400">{variableCount} משתנים</span>
        </div>
        <CopyTextButton value={content} label="העתק ENV" dark />
      </div>
      <pre
        dir="ltr"
        className="max-h-[420px] overflow-auto p-4 text-left font-mono text-xs leading-6 text-slate-200 sm:text-sm"
      >
        <code>
          {content.split("\n").map((line, index) => (
            <EnvLine key={`${index}-${line}`} line={line} />
          ))}
        </code>
      </pre>
    </div>
  );
}

function EnvLine({ line }: { line: string }) {
  const trimmed = line.trim();

  if (!trimmed) return <span className="block min-h-6">{" "}</span>;
  if (trimmed.startsWith("#")) {
    return <span className="block text-slate-500">{line}</span>;
  }

  const separatorIndex = line.indexOf("=");
  if (separatorIndex === -1) {
    return <span className="block text-slate-300">{line}</span>;
  }

  return (
    <span className="block min-w-max">
      <span className="text-sky-300">{line.slice(0, separatorIndex)}</span>
      <span className="text-slate-500">=</span>
      <span className="text-amber-200">{line.slice(separatorIndex + 1)}</span>
    </span>
  );
}
