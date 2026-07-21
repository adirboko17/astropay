export interface SyncResult {
  synced_count: number;
  created_count: number;
  updated_count: number;
  charges_synced_count: number;
  errors: SyncError[];
}

export interface SyncError {
  payplus_recurring_uid?: string;
  message: string;
}

export interface PayPlusRecurringListResponse {
  data?: PayPlusRecurringPayment[];
  pages?: number;
  count?: number;
}

export type PayPlusRecurringPayment = Record<string, unknown>;

export interface RecurringClientUpsertRow {
  payplus_customer_uid: string | null;
  payplus_recurring_uid: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  website_url: string | null;
  monthly_amount: number;
  currency: string;
  billing_day: number | null;
  next_billing_date: string | null;
  recurring_status: string;
  source: string;
  raw_payplus_data: Record<string, unknown>;
}

export interface PayPlusConfig {
  apiKey: string;
  secretKey: string;
  terminalUid: string;
  baseUrl: string;
}

export interface PayPlusRecurringChargeListResponse {
  data?: PayPlusRecurringCharge[];
  count?: number;
  recurring_uid?: string;
  customer_uid?: string;
}

export type PayPlusRecurringCharge = Record<string, unknown>;

export interface PayPlusChargeItemView {
  uid: string;
  chargeDate: string | null;
  executionDate: string | null;
  amount: number;
  currency: string;
  status: string;
  statusLabel: string;
  isSuccess: boolean;
  isFailed: boolean;
  isPending: boolean;
  failureReason: string | null;
  valid: boolean;
  cardLast4: string | null;
  productSummary: string;
  invoiceUrl: string | null;
  transactionId: number | null;
  chargeType: string | null;
}

export interface PayPlusRecurringMetaView {
  referenceNumber: string | null;
  payplusUid: string | null;
  customerUid: string | null;
  recurringType: string | null;
  recurringRange: number | null;
  numberOfCharges: string | null;
  firstChargeDate: string | null;
  lastChargeDate: string | null;
  nextChargeDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  alreadyChargedTransfers: number;
  alreadyChargedAmount: number;
  customerVatNumber: string | null;
  customerPayingVat: boolean | null;
  cardLast4: string | null;
  cardExpiry: string | null;
  cashierName: string | null;
}

export interface PayPlusRecurringDetailView {
  client: import("@/types/database").RecurringClient;
  meta: PayPlusRecurringMetaView;
  charges: PayPlusChargeItemView[];
  chargesError: string | null;
  currentMonthStatus: "charged" | "failed" | "pending" | "unknown";
  currentMonthLabel: string;
  successfulChargeCount: number;
  failedChargeCount: number;
  totalCollected: number;
}

export interface PayPlusPageSummary {
  recurringCount: number;
  activeCount: number;
  monthlyExpected: number;
  totalCollectedAllTime: number;
  totalChargeEvents: number;
  successfulCharges: number;
  failedCharges: number;
  pendingCharges: number;
  collectedThisMonth: number;
  linkedToCustomerCount: number;
}

export interface PayPlusPagePayload {
  items: PayPlusRecurringDetailView[];
  summary: PayPlusPageSummary;
  failureAlerts: { clientName: string; date: string; reason: string; amount: number }[];
  chargesAvailable: boolean;
  chargesUnavailableReason: string | null;
  fetchedAtIso: string;
}
