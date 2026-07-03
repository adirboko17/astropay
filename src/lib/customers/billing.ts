import type { Customer, CustomerCharge, CustomerPayment } from "@/types/database";

export interface CustomerBalance {
  customerId: string;
  totalDue: number;
  totalPaid: number;
  remaining: number;
  currency: string;
  paymentsCount: number;
  lastPaymentAt: string | null;
}

export interface ChargeBalance {
  chargeId: string;
  amount: number;
  paid: number;
  remaining: number;
  currency: string;
  unallocated?: boolean;
}

export type CollectionStatus = "paid" | "partial" | "unpaid" | "overpaid" | "no_due";

export function getPaymentsForCustomer(
  payments: CustomerPayment[],
  customerId: string,
) {
  return payments.filter((payment) => payment.customer_id === customerId);
}

export function getChargesForCustomer(
  charges: CustomerCharge[],
  customerId: string,
) {
  return charges.filter((charge) => charge.customer_id === customerId);
}

export function sumPayments(payments: CustomerPayment[]) {
  return payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

export function sumCharges(charges: CustomerCharge[]) {
  return charges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
}

export function computeCustomerBalance(
  customer: Customer,
  payments: CustomerPayment[],
  charges: CustomerCharge[] = [],
): CustomerBalance {
  const customerPayments = getPaymentsForCustomer(payments, customer.id);
  const customerCharges = getChargesForCustomer(charges, customer.id);
  const totalPaid = sumPayments(customerPayments);
  const totalDue =
    customerCharges.length > 0 ? sumCharges(customerCharges) : Number(customer.total_amount_due || 0);
  const lastPaymentAt = customerPayments
    .map((payment) => payment.paid_at)
    .sort((a, b) => b.localeCompare(a))[0] ?? null;

  return {
    customerId: customer.id,
    totalDue,
    totalPaid,
    remaining: Math.max(totalDue - totalPaid, 0),
    currency: customer.currency || "ILS",
    paymentsCount: customerPayments.length,
    lastPaymentAt,
  };
}

export function computeChargeBalance(
  charge: CustomerCharge,
  payments: CustomerPayment[],
): ChargeBalance {
  const chargePayments = payments.filter((payment) => payment.charge_id === charge.id);
  const paid = sumPayments(chargePayments);
  const amount = Number(charge.amount || 0);

  return {
    chargeId: charge.id,
    amount,
    paid,
    remaining: Math.max(amount - paid, 0),
    currency: charge.currency || "ILS",
  };
}

export function getUnallocatedPayments(
  payments: CustomerPayment[],
  customerId: string,
) {
  return getPaymentsForCustomer(payments, customerId).filter(
    (payment) => !payment.charge_id,
  );
}

export function getCollectionStatus(balance: CustomerBalance): CollectionStatus {
  if (balance.totalDue <= 0) return "no_due";
  if (balance.totalPaid >= balance.totalDue) {
    return balance.totalPaid > balance.totalDue ? "overpaid" : "paid";
  }
  if (balance.totalPaid > 0) return "partial";
  return "unpaid";
}

export const COLLECTION_STATUS_LABEL: Record<CollectionStatus, string> = {
  paid: "שולם במלואו",
  partial: "שולם חלקית",
  unpaid: "לא שולם",
  overpaid: "שולם בעודף",
  no_due: "אין חוב פתוח",
};

export function getCollectionStatusBadgeClass(status: CollectionStatus) {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
    case "partial":
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-100";
    case "unpaid":
      return "bg-red-50 text-red-700 ring-1 ring-red-100";
    case "overpaid":
      return "bg-blue-50 text-blue-800 ring-1 ring-blue-100";
    default:
      return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
  }
}

export function computeTotals(balances: CustomerBalance[]) {
  return balances.reduce(
    (acc, balance) => ({
      totalDue: acc.totalDue + balance.totalDue,
      totalPaid: acc.totalPaid + balance.totalPaid,
      remaining: acc.remaining + balance.remaining,
    }),
    { totalDue: 0, totalPaid: 0, remaining: 0 },
  );
}

export function formatCurrency(amount: number, currency = "ILS") {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(isoDate: string | null) {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}
