import { ClientsTable } from "@/components/dashboard/clients-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("recurring_clients")
    .select("*")
    .order("customer_name", { ascending: true });

  const clientList = error ? [] : (clients ?? []);

  const stats = {
    totalClients: clientList.length,
    chargedThisMonth: 0,
    failed: 0,
    overdue: 0,
    expectedAmount: 0,
    chargedAmount: 0,
  };

  return (
    <AppShell
      title="דשבורד הוראות קבע PayPlus"
      description="מעקב אחר לקוחות, חיובים חודשיים וסטטוס הוראות קבע"
    >
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="סה״כ לקוחות" value={String(stats.totalClients)} />
        <StatCard label="נגבו החודש" value={String(stats.chargedThisMonth)} />
        <StatCard label="נכשלו" value={String(stats.failed)} />
        <StatCard label="באיחור" value={String(stats.overdue)} />
        <StatCard
          label="סכום צפוי"
          value={formatCurrency(stats.expectedAmount)}
        />
        <StatCard
          label="סכום שנגבה"
          value={formatCurrency(stats.chargedAmount)}
        />
      </section>

      <section className="mt-8">
        <ClientsTable clients={clientList} />
      </section>
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
