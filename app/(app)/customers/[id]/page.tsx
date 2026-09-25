import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/data/customers";
import { getFollowUpsForCustomer } from "@/lib/data/follow-ups";
import { formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { NewFollowUpForm } from "./new-follow-up-form";
import { FollowUpRow } from "./follow-up-row";
import { CustomerStatusSelect } from "./customer-status-select";
import { DeleteCustomerButton } from "./delete-customer-button";
import { EditCustomerDialog } from "./edit-customer-dialog";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const followUps = await getFollowUpsForCustomer(id);

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="text-sm text-gray-500 hover:underline"
      >
        ← Back to customers
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{customer.name}</h1>
            <p className="text-sm text-gray-500">
              {customer.job ?? "No job set"} ·{" "}
              {[customer.email, customer.phone].filter(Boolean).join(" · ") ||
                "No contact info"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EditCustomerDialog
              customerId={customer.id}
              name={customer.name}
              email={customer.email}
              phone={customer.phone}
              job={customer.job}
              amountOwed={Number(customer.amount_owed)}
              status={customer.status}
              notes={customer.notes}
            />
            <DeleteCustomerButton
              customerId={customer.id}
              customerName={customer.name}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-gray-400">Amount owed</p>
            <p className="text-lg font-semibold">
              {formatCurrency(Number(customer.amount_owed))}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400">Status</p>
            <CustomerStatusSelect
              customerId={customer.id}
              status={customer.status}
            />
          </div>
          {customer.notes && (
            <div className="sm:col-span-3">
              <p className="text-xs uppercase text-gray-400">Notes</p>
              <p className="text-sm text-gray-700">{customer.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Follow-ups</h2>
        <div className="space-y-4">
          <NewFollowUpForm customerId={customer.id} />

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            {followUps.length === 0 ? (
              <EmptyState
                title="No follow-ups yet"
                description="Add one above to schedule your next touchpoint with this customer."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Due date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Notes</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {followUps.map((followUp) => (
                      <FollowUpRow
                        key={followUp.id}
                        followUp={followUp}
                        customer={customer}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
