import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomers } from "@/lib/data/customers";
import { getQuote } from "@/lib/data/quotes";
import { todayISODate } from "@/lib/format";
import { formatQuoteNumber, isQuoteExpired } from "@/lib/quotes";
import { QuoteActions } from "../quote-actions";
import { QuoteForm, type QuoteFormInitial } from "../quote-form";
import { QuoteStatusBadge } from "../quote-status-badge";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shows a stored number the way a person would type it: no trailing zeros. */
function plain(value: number): string {
  return value === 0 ? "" : String(value);
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const quote = await getQuote(id);
  if (!quote) notFound();

  const customers = await getCustomers();
  const label = formatQuoteNumber(quote.quote_number);

  const initial: QuoteFormInitial = {
    title: quote.title,
    client_name: quote.client_name,
    client_phone: quote.client_phone ?? "",
    client_email: quote.client_email ?? "",
    client_address: quote.client_address ?? "",
    customer_id: quote.customer_id ?? "",
    customer_view: quote.customer_view,
    valid_until: quote.valid_until ?? "",
    notes: quote.notes ?? "",
    discount_amount: plain(Number(quote.discount_amount)),
    tax_rate: plain(Number(quote.tax_rate)),
    items: quote.items.map((item) => ({
      section: item.section,
      stage: item.stage ?? "",
      description: item.description,
      unit: item.unit ?? "",
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    })),
  };

  return (
    <div className="space-y-6">
      <Link href="/quotes" className="text-sm text-gray-500 hover:underline">
        ← Back to quotes
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-gray-400">
              {label}
            </p>
            <h1 className="truncate text-xl font-semibold">{quote.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <span>{quote.client_name}</span>
              <QuoteStatusBadge
                status={quote.status}
                expired={isQuoteExpired(
                  quote.valid_until,
                  quote.status,
                  todayISODate()
                )}
              />
            </div>
          </div>
          <QuoteActions
            quoteId={quote.id}
            status={quote.status}
            quoteLabel={label}
          />
        </div>
      </div>

      <QuoteForm
        mode="edit"
        quoteId={quote.id}
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        }))}
        initial={initial}
      />
    </div>
  );
}
