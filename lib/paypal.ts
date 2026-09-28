/**
 * PayPal.me is a free personal payment link — no PayPal Business account,
 * no API keys, no OAuth needed. A contractor sets one up once at
 * paypal.me and GripBill just needs to remember their username to build
 * pre-filled payment links later. This keeps GripBill out of the business
 * of moving money: payments go straight into the contractor's own PayPal
 * account, GripBill never touches it.
 */

const PAYPAL_ME_PREFIXES = [
  "https://www.paypal.me/",
  "https://paypal.me/",
  "http://www.paypal.me/",
  "http://paypal.me/",
  "www.paypal.me/",
  "paypal.me/",
];

/** Accepts either a bare username ("jordansmith") or a pasted full link
 * ("https://paypal.me/jordansmith") and returns just the username — people
 * often paste the whole link when a field just asks for a "username". */
export function normalizePaypalUsername(input: string): string {
  let value = input.trim();

  for (const prefix of PAYPAL_ME_PREFIXES) {
    if (value.toLowerCase().startsWith(prefix)) {
      value = value.slice(prefix.length);
      break;
    }
  }

  value = value.replace(/^@/, "").split("/")[0].split("?")[0].trim();

  return value;
}

/** Builds a PayPal.me link pre-filled with the amount owed, so the
 * customer just has to tap it and confirm — no typing in a dollar figure
 * themselves. PayPal.me amounts are plain decimal numbers, no currency
 * symbol or commas. */
export function buildPaypalLink(username: string, amount: number): string {
  const cleanAmount = amount.toFixed(2);
  return `https://paypal.me/${username}/${cleanAmount}`;
}
