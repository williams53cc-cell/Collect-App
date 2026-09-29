import {
  PAYMENT_TRIGGER_LABELS,
  PAYMENT_TYPE_LABELS,
} from "@/lib/validation/customer";
import type { PaymentTrigger, PaymentType } from "@/types/database";

/**
 * The clause describing WHEN a payment is required (e.g. "before
 * materials are ordered", or a contractor's own custom note verbatim) —
 * shared by the timeline entry wording (lib/customer-events.ts) and the
 * payment context line shown on the customer page and, later, in drafted
 * messages (buildPaymentContextLine below). Returns null when there's
 * nothing extra worth saying: no trigger was set, the trigger is
 * "on a specific date" (the due date already communicates that on its
 * own), or "custom" was chosen but no note was actually typed in.
 */
export function describePaymentTrigger(
  trigger: PaymentTrigger | null,
  note: string | null
): string | null {
  if (!trigger || trigger === "on_specific_date") return null;
  if (trigger === "custom") {
    const trimmed = note?.trim();
    return trimmed ? trimmed : null;
  }
  return PAYMENT_TRIGGER_LABELS[trigger].toLowerCase();
}

/**
 * One line describing what a payment is for, e.g. "Materials payment —
 * required before materials are ordered." Used on the customer detail
 * page (and, in a later phase, in drafted messages). Skips entirely when
 * the type is "other" (the catch-all — not worth naming) and there's no
 * trigger to add either, so a plain balance with no special context never
 * grows an empty line.
 */
export function buildPaymentContextLine(
  paymentType: PaymentType | null,
  trigger: PaymentTrigger | null,
  triggerNote: string | null
): string | null {
  if (!paymentType) return null;
  const clause = describePaymentTrigger(trigger, triggerNote);
  if (paymentType === "other" && !clause) return null;
  const typeLabel = PAYMENT_TYPE_LABELS[paymentType];
  return clause ? `${typeLabel} — required ${clause}.` : `${typeLabel}.`;
}
