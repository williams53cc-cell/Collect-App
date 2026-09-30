import {
  FOLLOW_UP_FILTERS,
  getFollowUps,
  type FollowUpFilterKey,
} from "@/lib/data/follow-ups";
import { EmptyState } from "@/components/ui/empty-state";
import { FollowUpFilters } from "./follow-up-filters";
import { FollowUpListRow } from "./follow-up-list-row";
import { getBusinessProfile } from "@/lib/data/business-profile";

const FILTER_KEYS = FOLLOW_UP_FILTERS.map((filter) => filter.key);

function parseFilter(value: string | undefined): FollowUpFilterKey {
  return FILTER_KEYS.includes(value as FollowUpFilterKey)
    ? (value as FollowUpFilterKey)
    : "all";
}

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const followUps = await getFollowUps(filter);
  const businessProfile = await getBusinessProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Follow-ups</h1>
        <p className="text-sm text-gray-500">
          Everything you need to check in on, across every customer.
        </p>
      </div>

      <FollowUpFilters active={filter} />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {followUps.length === 0 ? (
          <EmptyState
            title="No follow-ups here"
            description="Add follow-ups from a customer's page to see them show up here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {followUps.map((followUp) => (
                  <FollowUpListRow
                    key={followUp.id}
                    followUp={followUp}
                    paymentMethod={businessProfile?.payment_method ?? null}
                    paymentLink={businessProfile?.payment_link ?? null}
                    includePaymentLinkDefault={
                      businessProfile?.include_payment_link_default ?? true
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
