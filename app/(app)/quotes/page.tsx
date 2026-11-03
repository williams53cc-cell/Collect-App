import Link from "next/link";
import { getQuotes } from "@/lib/data/quotes";
import { formatCurrency, formatDate, todayISODate } from "@/lib/format";
import { formatQuoteNumber, isQuoteExpired } from "@/lib/quotes";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QuoteStatusBadge } from "./quote-status-badge";

export default async function QuotesPage() {
  const quotes = await getQuotes();
  const today = todayISODate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quotes</h1>
          <p className="text-sm text-gray-500">
            Price a job with materials, labour and extras kept apart.
          </p>
        </div>
        <Link href="/quotes/new" className={buttonClassName()}>
          New quote
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {quotes.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            description="Create your first quote. You can save it, change it later, and copy it for the next job."
            action={
              <Link href="/quotes/new" className={buttonClassName()}>
                New quote
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {quotes.map((quote) => (
              <li key={quote.id}>
                <Link
                  href={`/quotes/${quote.id}`}
                  className="flex items-start justify-between gap-4 px-4 py-4 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      <span className="mr-2 text-xs font-normal text-gray-400">
                        {formatQuoteNumber(quote.quote_number)}
                      </span>
                      {quote.title}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {quote.client_name}
                      {quote.valid_until
                        ? ` · valid until ${formatDate(quote.valid_until)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(quote.total)}
                    </p>
                    <QuoteStatusBadge
                      status={quote.status}
                      expired={isQuoteExpired(
                        quote.valid_until,
                        quote.status,
                        today
                      )}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
