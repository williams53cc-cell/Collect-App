import type { QuoteDetail } from "@/lib/data/quotes";
import { formatQuoteNumber } from "@/lib/quotes";
import type { Database } from "@/types/database";
import type { QuotePdfInput } from "./quote-pdf";

type BusinessProfile = Database["public"]["Tables"]["business_profiles"]["Row"];

const orNull = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Turns a saved quote and the contractor's business profile into what the
 * PDF builder needs. Amounts come straight from the database view, so the
 * PDF always shows the same numbers as the screen. */
export function toQuotePdfInput(
  quote: QuoteDetail,
  profile: BusinessProfile | null
): QuotePdfInput {
  return {
    business: {
      name: profile?.business_name?.trim() ?? "",
      phone: orNull(profile?.business_phone),
      email: orNull(profile?.business_email),
      address: orNull(profile?.business_address),
      terms: orNull(profile?.quote_terms),
    },
    quote: {
      number: formatQuoteNumber(quote.quote_number),
      title: quote.title,
      issuedOn: quote.created_at,
      validUntil: quote.valid_until,
      clientName: quote.client_name,
      clientPhone: orNull(quote.client_phone),
      clientEmail: orNull(quote.client_email),
      jobAddress: orNull(quote.client_address),
      currency: quote.currency,
      customerView: quote.customer_view,
      notes: orNull(quote.notes),
      taxRate: quote.tax_rate,
      totals: {
        materials: quote.totals.materials_total,
        labour: quote.totals.labour_total,
        extras: quote.totals.extras_total,
        subtotal: quote.totals.subtotal,
        discount: quote.totals.discount_amount,
        tax: quote.totals.tax_amount,
        total: quote.totals.total,
      },
      items: quote.items.map((item) => ({
        section: item.section,
        stage: orNull(item.stage),
        description: item.description,
        unit: orNull(item.unit),
        quantity: item.quantity,
        unitPrice: item.unit_price,
        amount: item.amount,
      })),
    },
    timeZone: profile?.timezone ?? null,
  };
}
