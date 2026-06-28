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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">לקוחות</h2>
        <p className="mt-1 text-sm text-slate-500">
          רשימת לקוחות עם הוראות קבע — הנתונים יופיעו לאחר סנכרון PayPlus
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-start font-medium text-slate-600"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-slate-400"
                >
                  אין לקוחות להצגה עדיין
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                    {client.customer_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {client.customer_email ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatCurrency(client.monthly_amount, client.currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {client.billing_day ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {client.current_month_status}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {client.recurring_status ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
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
