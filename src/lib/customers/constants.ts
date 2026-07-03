import type { Customer } from "@/types/database";

export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  notes: string;
  total_amount_due: string;
  currency: string;
}

export const EMPTY_CUSTOMER: CustomerFormData = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "active",
  notes: "",
  total_amount_due: "",
  currency: "ILS",
};

export const CUSTOMER_STATUSES = [
  { value: "active", label: "פעיל" },
  { value: "inactive", label: "לא פעיל" },
  { value: "lead", label: "ליד" },
] as const;

export function customerToFormData(customer: Customer): CustomerFormData {
  return {
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    company: customer.company ?? "",
    status: customer.status || "active",
    notes: customer.notes ?? "",
    total_amount_due: customer.total_amount_due ? String(customer.total_amount_due) : "",
    currency: customer.currency || "ILS",
  };
}

export function getCustomerStatusLabel(status: string) {
  return CUSTOMER_STATUSES.find((option) => option.value === status)?.label ?? status;
}

export function getCustomerStatusBadgeClass(status: string) {
  if (status === "active") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
  if (status === "inactive") return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  if (status === "lead") return "bg-amber-50 text-amber-800 ring-1 ring-amber-100";
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}
