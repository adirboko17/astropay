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

export interface PayPlusRecurringChargeListResponse {
  data?: PayPlusRecurringCharge[];
  count?: number;
}

export type PayPlusRecurringCharge = Record<string, unknown>;

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
