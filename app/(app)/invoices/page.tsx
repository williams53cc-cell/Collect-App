import Link from "next/link";
import { getInvoices } from "@/lib/data/invoices";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatInvoiceNumber } from "@/lib/invoices";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InvoiceStatusBadge } from "./invoice-status-badge";

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Invoices</h1>
        <p className="text-sm text-gray-500">
          Bills for finished or started work. Make one from an accepted quote.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="When a customer accepts a quote, open it and tap Create invoice."
            action={
              <Link href="/quotes" className={buttonClassName()}>
                Go to quotes
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="flex items-start justify-between gap-4 px-4 py-4 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      <span className="mr-2 text-xs font-normal text-gray-400">
                        {formatInvoiceNumber(invoice.invoice_number)}
                      </span>
                      {invoice.title}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {invoice.client_name}
                      {invoice.due_on
                        ? ` \u00b7 due ${formatDate(invoice.due_on)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(invoice.total)}
                    </p>
                    <InvoiceStatusBadge status={invoice.status} />
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
