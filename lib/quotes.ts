import type {
  QuoteCustomerView,
  QuoteSection,
  QuoteStatus,
} from "@/types/database";

export const QUOTE_SECTIONS = ["materials", "labour", "extras"] as const;

export const QUOTE_SECTION_LABELS: Record<QuoteSection, string> = {
  materials: "Materials",
  labour: "Labour",
  extras: "Extras",
};

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined"] as const;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
};

export const QUOTE_CUSTOMER_VIEWS = ["detailed", "section_totals"] as const;

export const QUOTE_CUSTOMER_VIEW_LABELS: Record<QuoteCustomerView, string> = {
  detailed: "Show every line",
  section_totals: "Show one total per section",
};

/** Q-0007 style number shown on quotes. */
export function formatQuoteNumber(quoteNumber: number): string {
  return `Q-${String(quoteNumber).padStart(4, "0")}`;
}

/** A draft or sent quote whose "valid until" date has passed. Accepted and
 * declined quotes are finished, so they never show as expired. `today` is a
 * YYYY-MM-DD date string (see todayISODate in lib/format.ts). */
export function isQuoteExpired(
  validUntil: string | null,
  status: QuoteStatus,
  today: string
): boolean {
  if (!validUntil) return false;
  if (status !== "draft" && status !== "sent") return false;
  return validUntil < today;
}

export interface QuoteLine {
  section: QuoteSection;
  quantity: number;
  unitPrice: number;
}

export interface QuoteTotals {
  materials: number;
  labour: number;
  extras: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Money math. Everything is done in whole cents with BigInt, so there are no
// floating-point surprises, and it follows exactly the same rules as the
// database (the generated "amount" column and the quote_totals view in
// supabase/migrations/0011_quotes.sql):
//   line amount = quantity x unit price, rounded to the nearest cent
//   subtotal    = sum of line amounts
//   base        = subtotal - discount, never below 0
//   tax         = base x tax rate %, rounded to the nearest cent
//   total       = base + tax
// Quantity has up to 3 decimals, unit price and discount up to 2, and the
// tax rate up to 2.
// ---------------------------------------------------------------------------

function safe(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function lineCents(quantity: number, unitPrice: number): bigint {
  const milli = BigInt(Math.round(safe(quantity) * 1000));
  const cents = BigInt(Math.round(safe(unitPrice) * 100));
  return (milli * cents + BigInt(500)) / BigInt(1000);
}

function toAmount(cents: bigint): number {
  return Number(cents) / 100;
}

/** One line's amount: quantity x unit price, rounded to the nearest cent. */
export function lineAmount(quantity: number, unitPrice: number): number {
  return toAmount(lineCents(quantity, unitPrice));
}

export function calculateQuoteTotals(
  lines: QuoteLine[],
  discount: number,
  taxRatePercent: number
): QuoteTotals {
  const sums: Record<QuoteSection, bigint> = {
    materials: BigInt(0),
    labour: BigInt(0),
    extras: BigInt(0),
  };
  for (const line of lines) {
    sums[line.section] += lineCents(line.quantity, line.unitPrice);
  }

  const subtotal = sums.materials + sums.labour + sums.extras;
  const discountCents = BigInt(Math.round(safe(discount) * 100));
  const base = subtotal > discountCents ? subtotal - discountCents : BigInt(0);
  const rate = BigInt(Math.round(Math.min(safe(taxRatePercent), 100) * 100));
  const tax = (base * rate + BigInt(5000)) / BigInt(10000);

  return {
    materials: toAmount(sums.materials),
    labour: toAmount(sums.labour),
    extras: toAmount(sums.extras),
    subtotal: toAmount(subtotal),
    discount: toAmount(discountCents),
    tax: toAmount(tax),
    total: toAmount(base + tax),
  };
}
