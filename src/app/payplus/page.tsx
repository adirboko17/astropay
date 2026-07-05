import { ClientsTable } from "@/components/dashboard/clients-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RecurringClient } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PayPlusPage() {
  let clients: RecurringClient[] = [];
  let loadError: string | null = null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("recurring_clients")
      .select("*")
      .order("customer_name", { ascending: true });

    if (error) {
      loadError = error.message;
    } else {
      clients = data ?? [];
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "שגיאה בטעינת נתוני PayPlus";
  }

  const activeClients = clients.filter((client) => client.recurring_status === "active");
  const expectedAmount = activeClients.reduce(
    (sum, client) => sum + Number(client.monthly_amount || 0),
    0,
  );
  const activePercent = clients.length > 0 ? (activeClients.length / clients.length) * 100 : 0;

  return (
    <AppShell>
      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">לא ניתן לטעון נתונים</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <PageHero
            title="PayPlus — הוראות קבע"
            description="מעקב אחר לקוחות, חיובים חודשיים וסטטוס הוראות קבע"
            accent="violet"
            metrics={[
              { label: "הכנסה חודשית צפויה", value: formatCurrency(expectedAmount) },
              {
                label: "ממוצע להוראת קבע",
                value: formatCurrency(
                  activeClients.length ? expectedAmount / activeClients.length : 0,
                ),
              },
            ]}
            progress={
              clients.length > 0
                ? {
                    percent: activePercent,
                    label: "הוראות קבע פעילות",
                    startLabel: `${activeClients.length} פעילות`,
                    endLabel: `מתוך ${clients.length}`,
                  }
                : undefined
            }
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="סה״כ הוראות קבע" value={String(clients.length)} />
            <StatCard label="פעילות" value={String(activeClients.length)} />
            <StatCard
              label="לא פעילות"
              value={String(clients.length - activeClients.length)}
            />
            <StatCard
              label="מקושרות ללקוח"
              value={String(clients.filter((c) => c.customer_id).length)}
              hint="ניתן לקשר מעמוד הלקוח"
            />
          </section>

          <section>
            <ClientsTable clients={clients} />
          </section>
        </div>
      )}
    </AppShell>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount);
}
