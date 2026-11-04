import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/data/invoices";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatInvoiceNumber, formatLineQuantity } from "@/lib/invoices";
import { QUOTE_SECTIONS, QUOTE_SECTION_LABELS } from "@/lib/quotes";
import { InvoiceActions } from "../invoice-actions";
import { InvoiceStatusBadge } from "../invoice-status-badge";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const label = formatInvoiceNumber(invoice.invoice_number);
  const sectionTotals = {
    materials: invoice.totals.materials_total,
    labour: invoice.totals.labour_total,
    extras: invoice.totals.extras_total,
  };

  return (
    <div className="space-y-6">
      <Link href="/invoices" className="text-sm text-gray-500 hover:underline">
        {"\u2190"} Back to invoices
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-gray-400">
              {label}
            </p>
            <h1 className="truncate text-xl font-semibold">{invoice.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>{invoice.client_name}</span>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <dl className="mt-3 space-y-0.5 text-sm text-gray-500">
              {invoice.issued_on && (
                <div className="flex gap-2">
                  <dt>Issued:</dt>
                  <dd>{formatDate(invoice.issued_on)}</dd>
                </div>
              )}
              {invoice.due_on && (
                <div className="flex gap-2">
                  <dt>Due:</dt>
                  <dd>{formatDate(invoice.due_on)}</dd>
                </div>
              )}
              {invoice.status === "void" && (
                <div className="flex gap-2 text-red-700">
                  <dt>Cancelled:</dt>
                  <dd>
                    {invoice.voided_at
                      ? formatDate(invoice.voided_at.slice(0, 10))
                      : ""}
                    {invoice.void_reason ? ` \u2013 ${invoice.void_reason}` : ""}
                  </dd>
                </div>
              )}
              {invoice.quote_id && (
                <div className="flex gap-2">
                  <dt>From:</dt>
                  <dd>
                    <Link
                      href={`/quotes/${invoice.quote_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      the quote
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <InvoiceActions
            invoiceId={invoice.id}
            status={invoice.status}
            invoiceLabel={label}
          />
        </div>
        {invoice.status === "draft" && (
          <p className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400">
            This is a draft. It has no invoice number yet. Issue it when you are
            ready to send it.
          </p>
        )}
      </div>

      {QUOTE_SECTIONS.map((section) => {
        const rows = invoice.items.filter((item) => item.section === section);
        if (rows.length === 0) return null;
        return (
          <div
            key={section}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="text-base font-semibold">
                {QUOTE_SECTION_LABELS[section]}
              </h2>
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(sectionTotals[section])}
              </p>
            </div>
            <ul className="divide-y divide-gray-100">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900">{row.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatLineQuantity(row.quantity)}
                      {row.unit ? ` ${row.unit}` : ""} {"\u00d7"}{" "}
                      {formatCurrency(row.unit_price)}
                      {row.stage ? ` \u00b7 ${row.stage}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums">
                    {formatCurrency(row.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm sm:p-6">
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span className="tabular-nums">
            {formatCurrency(invoice.totals.subtotal)}
          </span>
        </div>
        {invoice.totals.discount_amount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Discount</span>
            <span className="tabular-nums">
              -{formatCurrency(invoice.totals.discount_amount)}
            </span>
          </div>
        )}
        {invoice.totals.tax_amount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Tax ({invoice.tax_rate}%)</span>
            <span className="tabular-nums">
              {formatCurrency(invoice.totals.tax_amount)}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
          <span className="font-semibold">Total</span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(invoice.totals.total)}
          </span>
        </div>
      </div>

      {invoice.notes && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm sm:p-6">
          <h2 className="mb-1 text-base font-semibold">Notes</h2>
          <p className="whitespace-pre-wrap text-gray-700">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
