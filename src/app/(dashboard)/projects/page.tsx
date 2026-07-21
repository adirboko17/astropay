import { Suspense } from "react";

import { CustomersManager } from "@/components/customers/customers-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ClientCredential,
  Customer,
  CustomerCharge,
  CustomerPayment,
  RecurringClient,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  let customers: Customer[] = [];
  let credentials: Pick<ClientCredential, "client_id">[] = [];
  let payments: CustomerPayment[] = [];
  let charges: CustomerCharge[] = [];
  let recurringClients: Pick<RecurringClient, "id" | "customer_id">[] = [];
  let loadError: string | null = null;

  try {
    const supabase = createAdminClient();

    const [customersResult, credentialsResult, paymentsResult, chargesResult, recurringResult] =
      await Promise.all([
        supabase.from("credential_clients").select("*").order("name", { ascending: true }),
        supabase.from("client_credentials").select("id, client_id"),
        supabase.from("customer_payments").select("*"),
        supabase.from("customer_charges").select("*"),
        supabase.from("recurring_clients").select("id, customer_id"),
      ]);

    if (customersResult.error) {
      loadError = customersResult.error.message;
    } else {
      customers = customersResult.data ?? [];
    }

    credentials = credentialsResult.data ?? [];
    payments = paymentsResult.data ?? [];
    charges = chargesResult.data ?? [];
    recurringClients = recurringResult.data ?? [];
  } catch (error) {
    loadError = error instanceof Error ? error.message : "שגיאה בטעינת הפרויקטים";
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
              טוען פרויקטים...
            </div>
          }
        >
          <CustomersManager
            mode="projects"
            initialCustomers={customers}
            initialCredentials={credentials}
            initialPayments={payments}
            initialCharges={charges}
            initialRecurringClients={recurringClients}
          />
        </Suspense>
      )}
    </>
  );
}
