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
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">הוראות קבע</h2>
        <p className="mt-1 text-sm text-slate-500">
          רשימת הוראות קבע מ-PayPlus — הנתונים יופיעו לאחר סנכרון
        </p>
      </div>

      <div className="overflow-x-auto">
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
            {clients.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-16 text-center text-slate-400"
                >
                  אין לקוחות להצגה עדיין
                </td>
              </tr>
            ) : (
              clients.map((client, index) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
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
