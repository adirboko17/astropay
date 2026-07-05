import {
  computeCustomerBalance,
  computeTotals,
  getCollectionStatus,
  isBillingCustomer,
} from "@/lib/customers/billing";
import type {
  ClientCredential,
  CredentialTable,
  Customer,
  CustomerCharge,
  CustomerPayment,
  RecurringClient,
} from "@/types/database";

export interface DebtorSummary {
  customerId: string;
  name: string;
  company: string | null;
  totalDue: number;
  totalPaid: number;
  remaining: number;
  currency: string;
}

export interface RecentPaymentSummary {
  paymentId: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  paidAt: string;
}

export type InsightTone = "positive" | "warning" | "info";

export interface Insight {
  tone: InsightTone;
  title: string;
  text: string;
}

export interface DashboardStats {
  customers: {
    billingCount: number;
    projectsCount: number;
  };
  collections: {
    totalDue: number;
    totalPaid: number;
    remaining: number;
    unpaidCount: number;
    partialCount: number;
    paidCount: number;
    collectionRate: number;
  };
  credentials: {
    recordsCount: number;
    tablesCount: number;
  };
  payplus: {
    recurringCount: number;
    activeCount: number;
    monthlyExpected: number;
    linkedToCustomerCount: number;
  };
  topDebtors: DebtorSummary[];
  recentPayments: RecentPaymentSummary[];
  insights: Insight[];
}

export function computeDashboardStats(
  customers: Customer[],
  payments: CustomerPayment[],
  charges: CustomerCharge[],
  credentials: Pick<ClientCredential, "id">[],
  tables: Pick<CredentialTable, "id">[],
  recurringClients: RecurringClient[],
): DashboardStats {
  const billingCustomers = customers.filter((customer) =>
    isBillingCustomer(customer, payments, charges),
  );
  const projectsCount = customers.length - billingCustomers.length;

  const balances = billingCustomers.map((customer) =>
    computeCustomerBalance(customer, payments, charges),
  );
  const collectionTotals = computeTotals(balances);

  let unpaidCount = 0;
  let partialCount = 0;
  let paidCount = 0;

  for (const balance of balances) {
    const status = getCollectionStatus(balance);
    if (status === "unpaid") unpaidCount += 1;
    if (status === "partial") partialCount += 1;
    if (status === "paid" || status === "overpaid") paidCount += 1;
  }

  const collectionRate =
    collectionTotals.totalDue > 0
      ? Math.min(collectionTotals.totalPaid / collectionTotals.totalDue, 1)
      : 0;

  const customerById = new Map(customers.map((customer) => [customer.id, customer]));

  const topDebtors: DebtorSummary[] = balances
    .filter((balance) => balance.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 5)
    .map((balance) => {
      const customer = customerById.get(balance.customerId);
      return {
        customerId: balance.customerId,
        name: customer?.name ?? "לקוח לא ידוע",
        company: customer?.company ?? null,
        totalDue: balance.totalDue,
        totalPaid: balance.totalPaid,
        remaining: balance.remaining,
        currency: balance.currency,
      };
    });

  const recentPayments: RecentPaymentSummary[] = [...payments]
    .sort((a, b) => b.paid_at.localeCompare(a.paid_at))
    .slice(0, 5)
    .map((payment) => ({
      paymentId: payment.id,
      customerId: payment.customer_id,
      customerName: customerById.get(payment.customer_id)?.name ?? "לקוח לא ידוע",
      amount: Number(payment.amount || 0),
      currency: payment.currency || "ILS",
      paidAt: payment.paid_at,
    }));

  const activeRecurring = recurringClients.filter(
    (client) => client.recurring_status === "active",
  );

  const stats: DashboardStats = {
    customers: {
      billingCount: billingCustomers.length,
      projectsCount,
    },
    collections: {
      totalDue: collectionTotals.totalDue,
      totalPaid: collectionTotals.totalPaid,
      remaining: collectionTotals.remaining,
      unpaidCount,
      partialCount,
      paidCount,
      collectionRate,
    },
    credentials: {
      recordsCount: credentials.length,
      tablesCount: tables.length,
    },
    payplus: {
      recurringCount: recurringClients.length,
      activeCount: activeRecurring.length,
      monthlyExpected: activeRecurring.reduce(
        (sum, client) => sum + Number(client.monthly_amount || 0),
        0,
      ),
      linkedToCustomerCount: recurringClients.filter((client) => client.customer_id).length,
    },
    topDebtors,
    recentPayments,
    insights: [],
  };

  stats.insights = buildInsights(stats);
  return stats;
}

function buildInsights(stats: DashboardStats): Insight[] {
  const insights: Insight[] = [];
  const { collections, customers, payplus, topDebtors } = stats;
  const ratePercent = Math.round(collections.collectionRate * 100);

  if (collections.totalDue > 0) {
    if (ratePercent >= 80) {
      insights.push({
        tone: "positive",
        title: "קצב גבייה מצוין",
        text: `גבית כבר ${ratePercent}% מהסכום הכולל — עוד ${formatShekel(collections.remaining)} ואתה מסיים את הגבייה.`,
      });
    } else if (ratePercent >= 50) {
      insights.push({
        tone: "info",
        title: "עברת את חצי הדרך",
        text: `${ratePercent}% מהסכום כבר נגבה. נותרו ${formatShekel(collections.remaining)} לגבייה.`,
      });
    } else {
      insights.push({
        tone: "warning",
        title: "יש עוד עבודה בגבייה",
        text: `נגבו רק ${ratePercent}% עד כה — נותרו ${formatShekel(collections.remaining)} מתוך ${formatShekel(collections.totalDue)}.`,
      });
    }
  }

  if (collections.unpaidCount > 0) {
    insights.push({
      tone: "warning",
      title: `${collections.unpaidCount} לקוחות טרם שילמו כלל`,
      text: "כדאי לשלוח להם תזכורת — כל שקל שנגבה מוקדם חוסך רדיפות בהמשך.",
    });
  } else if (customers.billingCount > 0) {
    insights.push({
      tone: "positive",
      title: "אין לקוחות שלא שילמו",
      text: "כל הלקוחות עם סכום גבייה שילמו לפחות תשלום אחד. עבודה יפה!",
    });
  }

  if (topDebtors.length > 0) {
    const top = topDebtors[0];
    const share =
      collections.remaining > 0 ? Math.round((top.remaining / collections.remaining) * 100) : 0;
    if (share >= 30) {
      insights.push({
        tone: "info",
        title: `${top.name} הוא החוב הגדול ביותר`,
        text: `${formatShekel(top.remaining)} — כ-${share}% מכל היתרה לגבייה מרוכזת אצל לקוח אחד.`,
      });
    }
  }

  if (payplus.recurringCount === 0) {
    insights.push({
      tone: "info",
      title: "אין עדיין הוראות קבע מסונכרנות",
      text: "הפעל סנכרון PayPlus כדי לראות כאן הכנסה חודשית קבועה.",
    });
  } else if (payplus.monthlyExpected > 0) {
    insights.push({
      tone: "positive",
      title: "הכנסה חודשית קבועה",
      text: `${payplus.activeCount} הוראות קבע פעילות מכניסות ${formatShekel(payplus.monthlyExpected)} בחודש.`,
    });
  }

  return insights.slice(0, 4);
}

function formatShekel(amount: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount);
}
