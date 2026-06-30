import type { RecurringClient } from "@/types/database";

const columns = [
  "שם לקוח",
  "אימייל",
  "סכום חודשי",
  "יום חיוב",
  "סטטוס חודש נוכחי",
  "סטטוס הוראת קבע",
  "חיוב הבא",
] as const;

interface ClientsTableProps {
  clients: RecurringClient[];
}

export function ClientsTable({ clients }: ClientsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
        <h2 className="text-lg font-semibold text-slate-900">לקוחות</h2>
        <p className="mt-1 text-sm text-slate-500">
          רשימת לקוחות עם הוראות קבע — הנתונים יופיעו לאחר סנכרון PayPlus
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-slate-400 sm:px-6">
          אין לקוחות להצגה עדיין
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-100 md:hidden">
            {clients.map((client) => (
              <ClientMobileCard key={client.id} client={client} />
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="border-b border-slate-200 bg-slate-50/90 px-4 py-3 text-start text-xs font-semibold tracking-wide text-slate-500"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr
                    key={client.id}
                    className={`transition hover:bg-blue-50/40 ${
                      index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    }`}
                  >
                    <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-900">
                      {client.customer_name}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                      {client.customer_email ?? "—"}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                      {formatCurrency(client.monthly_amount, client.currency)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                      {client.billing_day ?? "—"}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                      {client.current_month_status}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                      {client.recurring_status ?? "—"}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                      {client.next_billing_date ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ClientMobileCard({ client }: { client: RecurringClient }) {
  return (
    <article className="space-y-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">
            {client.customer_name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {client.customer_email ?? "ללא אימייל"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {formatCurrency(client.monthly_amount, client.currency)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <MobileField
          label="יום חיוב"
          value={client.billing_day != null ? String(client.billing_day) : "—"}
        />
        <MobileField
          label="חיוב הבא"
          value={client.next_billing_date ?? "—"}
        />
        <MobileField label="סטטוס חודש" value={client.current_month_status} />
        <MobileField
          label="הוראת קבע"
          value={client.recurring_status ?? "—"}
        />
      </dl>
    </article>
  );
}

function MobileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-slate-700">{value}</dd>
    </div>
  );
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
