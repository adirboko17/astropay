import { CollectionsManager } from "@/components/collections/collections-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, CustomerCharge, CustomerPayment } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  let customers: Customer[] = [];
  let payments: CustomerPayment[] = [];
  let charges: CustomerCharge[] = [];
  let loadError: string | null = null;

  try {
    const supabase = createAdminClient();

    const [customersResult, paymentsResult, chargesResult] = await Promise.all([
      supabase.from("credential_clients").select("*"),
      supabase.from("customer_payments").select("*"),
      supabase.from("customer_charges").select("*"),
    ]);

    if (customersResult.error) {
      loadError = customersResult.error.message;
    } else {
      customers = customersResult.data ?? [];
    }

    payments = paymentsResult.data ?? [];
    charges = chargesResult.data ?? [];
  } catch (error) {
    loadError = error instanceof Error ? error.message : "שגיאה בטעינת נתוני הגבייה";
  }

  return (
    <>
      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">לא ניתן לטעון נתונים</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : (
        <CollectionsManager initialCustomers={customers} initialPayments={payments} initialCharges={charges} />
      )}
    </>
  );
}
