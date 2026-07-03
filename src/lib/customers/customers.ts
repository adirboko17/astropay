import type { ClientCredential, Customer } from "@/types/database";

export function sortCustomers(customers: Customer[] | null | undefined) {
  return [...(customers ?? [])].sort((a, b) => a.name.localeCompare(b.name, "he"));
}

export function findCustomerById(
  customers: Customer[] | null | undefined,
  customerId: string | null | undefined,
) {
  if (!customerId || !customers) return null;
  return customers.find((customer) => customer.id === customerId) ?? null;
}

export function filterCustomers(customers: Customer[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return customers;

  return customers.filter((customer) => {
    return (
      customer.name.toLowerCase().includes(needle) ||
      (customer.email?.toLowerCase().includes(needle) ?? false) ||
      (customer.phone?.toLowerCase().includes(needle) ?? false) ||
      (customer.company?.toLowerCase().includes(needle) ?? false)
    );
  });
}

export function countCredentialsForCustomer(
  credentials: Pick<ClientCredential, "client_id">[],
  customerId: string,
) {
  return credentials.filter((credential) => credential.client_id === customerId).length;
}
