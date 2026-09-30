import { buildPaypalLink, normalizePaypalUsername } from "@/lib/paypal";
import type { PaymentMethod } from "@/types/database";

/**
 * Builds the payment link to drop into a drafted message, from whatever
 * the contractor saved in their Business Profile (Settings > Getting
 * paid).
 *
 * PayPal gets special handling: GripBill knows exactly how a paypal.me
 * link is shaped, so it rebuilds one pre-filled with the amount owed —
 * the customer taps it and confirms, instead of having to type in a
 * dollar figure themselves. That's the same behavior the old
 * PayPal-only settings field had, just fed by the saved payment_link
 * instead of a separate username field.
 *
 * Every other method (Venmo, Zelle, a personal payment page, etc.) is
 * used exactly as saved, with no amount pre-fill — GripBill doesn't know
 * those link formats well enough to safely rewrite them.
 */
export function buildBusinessPaymentLink(
  paymentMethod: PaymentMethod | null,
  paymentLink: string | null,
  amount: number
): string | null {
  if (!paymentLink) return null;

  if (paymentMethod === "paypal") {
    const username = normalizePaypalUsername(paymentLink);
    if (username) return buildPaypalLink(username, amount);
  }

  return paymentLink;
}
