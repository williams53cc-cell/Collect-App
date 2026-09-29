import { formatCurrency, formatDate } from "@/lib/format";
import { formatStatusLabel } from "@/lib/validation/follow-up";
import type { FollowUpStatus } from "@/types/database";

/**
 * Pure builders for the entries that show up in a customer's payment
 * timeline (see components/customer-timeline.tsx). Kept separate from the
 * server actions that call them so the exact wording can be unit tested
 * without touching Supabase — each builder takes plain values already on
 * hand in the calling action and returns the {headline, detail} pair that
 * action then hands to logCustomerEvent() (lib/data/customer-events.ts) to
 * insert.
 */
export interface CustomerEventContent {
  headline: string;
  detail: string;
}

export function customerAddedEvent(
  amountOwed: number,
  job: string | null
): CustomerEventContent {
  const jobClause = job ? ` for ${job}` : "";
  return {
    headline: "Customer added",
    detail: `Added with an amount owed of ${formatCurrency(amountOwed)}${jobClause}.`,
  };
}

export function amountOwedChangedEvent(
  previousAmount: number,
  nextAmount: number
): CustomerEventContent {
  return {
    headline: "Amount owed updated",
    detail: `Amount owed changed from ${formatCurrency(previousAmount)} to ${formatCurrency(nextAmount)}.`,
  };
}

export function followUpCreatedEvent(
  reason: string,
  dueDate: string
): CustomerEventContent {
  return {
    headline: "Follow-up added",
    detail: `"${reason}" added, due ${formatDate(dueDate)}.`,
  };
}

export function followUpStatusChangedEvent(
  previousStatus: FollowUpStatus,
  nextStatus: FollowUpStatus
): CustomerEventContent {
  return {
    headline: "Follow-up status changed",
    detail: `Status changed from ${formatStatusLabel(previousStatus)} to ${formatStatusLabel(nextStatus)}.`,
  };
}

export function promisedDateSetEvent(
  promisedDate: string
): CustomerEventContent {
  return {
    headline: "Promised to pay",
    detail: `Customer promised to pay by ${formatDate(promisedDate)}.`,
  };
}

export function promisedDateClearedEvent(): CustomerEventContent {
  return {
    headline: "Promise cleared",
    detail: "The logged promise-to-pay date was cleared.",
  };
}
