import Link from "next/link";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatCurrency, formatDate, getGreeting } from "@/lib/format";
import { StatCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DraftMessageDialog } from "@/components/message-draft-dialog";
import { CallScriptDialog } from "@/components/call-script-dialog";
import { getBusinessProfile } from "@/lib/data/business-profile";
import type { AttentionReason } from "@/lib/dashboard-summary";

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** What each row in "Needs attention" says it's about, and which of the
 * follow-up's two dates (its own due date, or a customer's promised-to-pay
 * date) that's talking about. "Overdue" only applies to the first two —
 * a promise or follow-up that's due *today* hasn't been missed yet. */
const ATTENTION_REASON_INFO: Record<
  AttentionReason,
  { title: string; dateLabel: string; overdue: boolean }
> = {
  broke_promise: {
    title: "Payment promise missed",
    dateLabel: "Promise date",
    overdue: true,
  },
  overdue: {
    title: "Follow-up overdue",
    dateLabel: "Due date",
    overdue: true,
  },
  promise_due_today: {
    title: "Payment promise due today",
    dateLabel: "Promise date",
    overdue: false,
  },
  due_today: {
    title: "Follow-up due today",
    dateLabel: "Due date",
    overdue: false,
  },
};

export default async function DashboardPage() {
  const { customerStats, summary, attentionFollowUps } =
    await getDashboardData();

  const businessProfile = await getBusinessProfile();
  const senderName =
    businessProfile?.first_name || businessProfile?.business_name || null;
  const greeting = getGreeting(businessProfile?.timezone ?? null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">
          {businessProfile?.first_name
            ? `${greeting}, ${businessProfile.first_name}`
            : "Dashboard"}
        </h1>
        <p className="text-sm text-gray-500">
          {businessProfile?.business_name || "Where things stand right now."}
        </p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Money outstanding"
            value={formatCurrency(customerStats.outstandingBalance)}
            helpText={`Across ${plural(customerStats.totalCustomers, "customer")}`}
          />
          <StatCard
            label="Follow-ups due today"
            value={plural(summary.dueToday.count, "follow-up")}
            helpText={`${formatCurrency(summary.dueToday.amount)} needs action today`}
            tone={summary.dueToday.count > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Overdue follow-ups"
            value={plural(summary.overdue.count, "follow-up")}
            helpText={`${formatCurrency(summary.overdue.amount)} past due`}
            tone={summary.overdue.count > 0 ? "danger" : "default"}
          />
          <StatCard
            label="Promised to pay"
            value={plural(summary.promised.customerCount, "customer")}
            helpText={
              summary.promised.dueTodayCount > 0
                ? `${formatCurrency(summary.promised.amount)} expected · ${plural(summary.promised.dueTodayCount, "promise")} due today`
                : `${formatCurrency(summary.promised.amount)} expected`
            }
            tone={summary.promised.dueTodayCount > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Needs a call"
            value={plural(summary.needsCall.count, "follow-up")}
            helpText={`${formatCurrency(summary.needsCall.amount)} requires a call`}
            tone={summary.needsCall.count > 0 ? "danger" : "default"}
          />
        </div>
        <p className="text-xs text-gray-400">
          Amounts may overlap — each card shows the balance connected to that
          follow-up group, not a separate total.
        </p>
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
            <div className="divide-y divide-gray-100">
              {attentionFollowUps.map((followUp) => {
                const info = ATTENTION_REASON_INFO[followUp.reason];
                const isPromiseReason =
                  followUp.reason === "broke_promise" ||
                  followUp.reason === "promise_due_today";
                const relevantDate = isPromiseReason
                  ? followUp.promised_date
                  : followUp.due_date;

                return (
                  <div
                    key={followUp.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <Link
                        href={`/customers/${followUp.customer_id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {followUp.customerName}
                      </Link>
                      <p className="text-sm text-gray-700">{info.title}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {info.dateLabel}: {formatDate(relevantDate)}
                        {info.overdue && (
                          <span className="ml-1 font-medium text-red-600">
                            — Overdue
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Amount outstanding:{" "}
                        <span className="font-medium text-gray-900">
                          {formatCurrency(followUp.customerAmountOwed)}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Action:</span>
                      {followUp.status === "needs_call" ? (
                        <CallScriptDialog
                          customerName={followUp.customerName}
                          customerJob={followUp.customerJob}
                          amountOwed={followUp.customerAmountOwed}
                          dueDate={followUp.due_date}
                          promisedDate={followUp.promised_date}
                        />
                      ) : (
                        <DraftMessageDialog
                          customerName={followUp.customerName}
                          customerJob={followUp.customerJob}
                          amountOwed={followUp.customerAmountOwed}
                          email={followUp.customerEmail}
                          phone={followUp.customerPhone}
                          dueDate={followUp.due_date}
                          promisedDate={followUp.promised_date}
                          paymentMethod={businessProfile?.payment_method ?? null}
                          paymentLink={businessProfile?.payment_link ?? null}
                          includePaymentLinkDefault={
                            businessProfile?.include_payment_link_default ?? true
                          }
                          paymentType={followUp.customerPaymentType}
                          paymentTrigger={followUp.customerPaymentTrigger}
                          paymentTriggerNote={followUp.customerPaymentTriggerNote}
                          senderName={senderName}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
