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
import {
  computeChargeBalance,
  computeCustomerBalance,
  formatCurrency,
  formatDate,
  getCollectionStatus,
  getCollectionStatusBadgeClass,
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
  unlinkedRecurringClients: RecurringClient[];
}

export function CustomerDetail({
  customer: initialCustomer,
  initialCredentials,
  tables,
  initialPayments,
  initialCharges,
  linkedRecurringClient,
  unlinkedRecurringClients,
}: CustomerDetailProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [credentials, setCredentials] = useState<ClientCredential[]>(initialCredentials);
  const [payments, setPayments] = useState<CustomerPayment[]>(initialPayments);
  const [charges, setCharges] = useState<CustomerCharge[]>(initialCharges);

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

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const balance = useMemo(
    () => computeCustomerBalance(customer, payments, charges),
    [customer, payments, charges],
  );
  const status = getCollectionStatus(balance);

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
      } else {
        const result = await createCredential(dataWithName, tableId, customer.id);
        if (result.error) {
          notify(null, result.error);
          return;
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
        href="/customers"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        ← חזור לכל הלקוחות
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
                <p className="text-xs font-semibold text-blue-600">כרטיס לקוח</p>
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
              ערוך פרטי לקוח
            </button>
          </div>
          {customer.notes ? (
            <p className="relative mt-4 max-w-2xl rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-100">
              {customer.notes}
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">פרטי התחברות</h2>
              <p className="mt-1 text-sm text-slate-500">{credentials.length} רשומות מקושרות ללקוח</p>
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

          <div className="max-h-[520px] overflow-y-auto p-4">
            {sortedCredentials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-600">אין פרטי התחברות מקושרים</p>
                <p className="mt-1 text-sm text-slate-400">
                  הוסף Supabase, אתר, או כל שירות אחר שקשור ללקוח זה
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
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

        <div className="space-y-5">
          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">גבייה</h2>
              <p className="mt-1 text-sm text-slate-500">מעקב אחר סכום כולל לגבייה ותשלומים שהתקבלו</p>
            </div>

            <div className="space-y-3 px-5 py-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 px-2 py-3">
                  <p className="text-xs text-slate-500">סה״כ לגבייה</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCurrency(balance.totalDue, balance.currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 px-2 py-3">
                  <p className="text-xs text-emerald-700">שולם</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-800">
                    {formatCurrency(balance.totalPaid, balance.currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 px-2 py-3">
                  <p className="text-xs text-red-700">נותר לגבייה</p>
                  <p className="mt-1 text-sm font-semibold text-red-700">
                    {formatCurrency(balance.remaining, balance.currency)}
                  </p>
                </div>
              </div>

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

              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
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
                    {sortedCharges.map((charge) => {
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
              </div>

              <button
                type="button"
                onClick={openAddPayment}
                className="h-9 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                + רישום תשלום
              </button>

              <div className="space-y-2 pt-1">
                {sortedPayments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
                    אין תשלומים רשומים עדיין
                  </p>
                ) : (
                  sortedPayments.map((payment) => {
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
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">הוראת קבע PayPlus</h2>
              <p className="mt-1 text-sm text-slate-500">חיבור בין הלקוח לחיובים החודשיים ב-PayPlus</p>
            </div>

            <div className="px-5 py-4">
              {linkedRecurringClient ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-3">
                    <p className="text-sm font-medium text-indigo-900">
                      {formatCurrency(
                        Number(linkedRecurringClient.monthly_amount),
                        linkedRecurringClient.currency,
                      )}{" "}
                      / חודש
                    </p>
                    <p className="mt-1 text-xs text-indigo-700">
                      סטטוס: {linkedRecurringClient.recurring_status ?? "—"} · חיוב הבא:{" "}
                      {formatDate(linkedRecurringClient.next_billing_date)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleUnlinkRecurring}
                    className="h-9 w-full rounded-xl border border-slate-200 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
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
        </div>
      </div>

      {editingProfile ? (
        <CustomerFormModal
          mode="edit"
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
  const website = credential.website_url?.trim() ?? "";
  const isLink = website.startsWith("http://") || website.startsWith("https://");

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <span
          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${getPlatformBadgeClass(tableName)}`}
        >
          {tableName}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onGoToTable}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            לטבלה
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
          >
            ערוך
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
          >
            מחק
          </button>
        </div>
      </div>

      <dl className="grid gap-4 px-4 py-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-slate-500">אימייל</dt>
          <dd className="mt-1.5 text-sm text-slate-800">{credential.login_email || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">משתמש</dt>
          <dd className="mt-1.5 text-sm text-slate-800">{credential.login_username || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">אתר</dt>
          <dd className="mt-1.5 text-sm text-slate-800">
            {website ? (
              isLink ? (
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
              )
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">סיסמה</dt>
          <dd className="mt-1.5 flex items-center gap-2 text-sm text-slate-800">
            {credential.password ? (
              <>
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
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        {credential.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-500">הערות</dt>
            <dd className="mt-1.5 text-sm text-slate-800">{credential.notes}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
