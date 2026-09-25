import Link from "next/link";
import { getCustomers } from "@/lib/data/customers";
import { formatCurrency } from "@/lib/format";
import { CustomerStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { CustomerStatus } from "@/types/database";
import { NewCustomerDialog } from "./new-customer-form";
import { CustomerFilters } from "./customer-filters";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const hasFilters = !!(params.search || (params.status && params.status !== "all"));

  const customers = await getCustomers({
    search: params.search,
    status: (params.status as CustomerStatus | "all" | undefined) ?? "all",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <p className="text-sm text-gray-500">
            Everyone who owes you money, in one place.
          </p>
        </div>
        <NewCustomerDialog />
      </div>

      <CustomerFilters />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {customers.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No matching customers" : "No customers yet"}
            description={
              hasFilters
                ? "Try a different search or clear the status filter."
                : "Add your first customer to start tracking who owes you."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Amount owed</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {customer.email ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {customer.phone ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {customer.job ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-900">
                      {formatCurrency(Number(customer.amount_owed))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <CustomerStatusBadge status={customer.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
