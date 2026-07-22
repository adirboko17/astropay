import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CustomerDetail } from "@/components/customers/customer-detail";
import { loadPayPlusPagePayload } from "@/lib/payplus/recurring-view";
import type { PayPlusRecurringDetailView } from "@/lib/payplus/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ClientCredential,
  Customer,
  CredentialTable,
  CustomerCharge,
  CustomerPayment,
  RecurringClient,
} from "@/types/database";

export const dynamic = "force-dynamic";

interface CustomerPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerPage({ params }: CustomerPageProps) {
  const { id } = await params;

  let customer: Customer | null = null;
  let credentials: ClientCredential[] = [];
  let tables: CredentialTable[] = [];
  let payments: CustomerPayment[] = [];
  let charges: CustomerCharge[] = [];
  let linkedRecurringClient: RecurringClient | null = null;
  let linkedRecurringDetail: PayPlusRecurringDetailView | null = null;
  let unlinkedRecurringClients: RecurringClient[] = [];
  let loadError: string | null = null;

  try {
    const supabase = createAdminClient();

    const [
      customerResult,
      credentialsResult,
      tablesResult,
      paymentsResult,
      chargesResult,
      linkedResult,
      unlinkedResult,
    ] = await Promise.all([
      supabase.from("credential_clients").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("client_credentials")
        .select("*")
        .eq("client_id", id)
        .order("updated_at", { ascending: false }),
      supabase.from("credential_tables").select("*").order("name", { ascending: true }),
      supabase
        .from("customer_payments")
        .select("*")
        .eq("customer_id", id)
        .order("paid_at", { ascending: false }),
      supabase
        .from("customer_charges")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("recurring_clients").select("*").eq("customer_id", id).maybeSingle(),
      supabase.from("recurring_clients").select("*").is("customer_id", null),
    ]);

    if (customerResult.error) {
      loadError = customerResult.error.message;
    } else if (!customerResult.data) {
      notFound();
    } else {
      customer = customerResult.data;
    }

    credentials = credentialsResult.data ?? [];
    tables = tablesResult.data ?? [];
    payments = paymentsResult.data ?? [];
    charges = chargesResult.data ?? [];
    linkedRecurringClient = linkedResult.data ?? null;
    unlinkedRecurringClients = unlinkedResult.data ?? [];

    if (linkedRecurringClient) {
      const payPlusPayload = await loadPayPlusPagePayload([linkedRecurringClient]);
      linkedRecurringDetail = payPlusPayload.items[0] ?? null;
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "שגיאה בטעינת פרטי הלקוח";
  }

  if (!customer) {
    notFound();
  }

  return (
    <>
      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">לא ניתן לטעון נתונים</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
              טוען לקוח...
            </div>
          }
        >
          <CustomerDetail
            customer={customer}
            initialCredentials={credentials}
            tables={tables}
            initialPayments={payments}
            initialCharges={charges}
            linkedRecurringClient={linkedRecurringClient}
            linkedRecurringDetail={linkedRecurringDetail}
            unlinkedRecurringClients={unlinkedRecurringClients}
          />
        </Suspense>
      )}
    </>
  );
}
