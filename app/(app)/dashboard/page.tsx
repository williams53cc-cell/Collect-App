import Link from "next/link";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatCurrency, formatDate, isOverdue } from "@/lib/format";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DraftMessageDialog } from "@/components/message-draft-dialog";

export default async function DashboardPage() {
  const { customerStats, followUpStats, attentionFollowUps } =
    await getDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Where things stand right now.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Money outstanding"
          value={formatCurrency(customerStats.outstandingBalance)}
          helpText={`Across ${customerStats.totalCustomers} customer${
            customerStats.totalCustomers === 1 ? "" : "s"
          }`}
        />
        <StatCard
          label="Follow-ups due today"
          value={String(followUpStats.dueTodayCount)}
          tone={followUpStats.dueTodayCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Overdue follow-ups"
          value={String(followUpStats.overdueCount)}
          tone={followUpStats.overdueCount > 0 ? "danger" : "default"}
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Needs attention</h2>
          <Link
            href="/follow-ups"
            className="text-sm text-gray-500 hover:underline"
          >
            View all follow-ups
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {attentionFollowUps.length === 0 ? (
            <EmptyState
              title="Nothing due or overdue"
              description="You're all caught up on follow-ups."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Due date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attentionFollowUps.map((followUp) => {
                    const overdue = isOverdue(
                      followUp.due_date,
                      followUp.status
                    );
                    return (
                      <tr key={followUp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/customers/${followUp.customer_id}`}
                            className="font-medium text-gray-900 hover:underline"
                          >
                            {followUp.customerName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {followUp.reason}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              overdue
                                ? "font-medium text-red-600"
                                : "text-gray-600"
                            }
                          >
                            {formatDate(followUp.due_date)}
                          </span>
                          {overdue && (
                            <span className="ml-2">
                              <Badge tone="red">Overdue</Badge>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DraftMessageDialog
                            customerName={followUp.customerName}
                            customerJob={followUp.customerJob}
                            amountOwed={followUp.customerAmountOwed}
                            contact={followUp.customerContact}
                            dueDate={followUp.due_date}
                            promisedDate={followUp.promised_date}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
