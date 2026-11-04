"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createInvoiceFromQuoteAction } from "@/app/(app)/invoices/actions";
import { Button } from "@/components/ui/button";
import { formatInvoiceNumber } from "@/lib/invoices";
import type { InvoiceStatus, QuoteStatus } from "@/types/database";

export interface LinkedInvoice {
  id: string;
  invoice_number: number | null;
  status: InvoiceStatus;
}

/** On a quote: turns an accepted quote into an invoice, and lists the
 * invoices already made from it. */
export function CreateInvoice({
  quoteId,
  status,
  invoices,
}: {
  quoteId: string;
  status: QuoteStatus;
  invoices: LinkedInvoice[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const accepted = status === "accepted";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {accepted ? (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await createInvoiceFromQuoteAction(quoteId);
                if (result?.error) setError(result.error);
              });
            }}
          >
            {isPending
              ? "Creating..."
              : invoices.length > 0
                ? "Create another invoice"
                : "Create invoice"}
          </Button>
        ) : (
          <p className="text-xs text-gray-400">
            When the customer accepts, set the status to Accepted to turn this
            quote into an invoice.
          </p>
        )}
        {invoices.length > 0 && (
          <p className="text-xs text-gray-500">
            Invoices from this quote:{" "}
            {invoices.map((invoice, index) => (
              <span key={invoice.id}>
                {index > 0 ? ", " : ""}
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {formatInvoiceNumber(invoice.invoice_number)}
                </Link>
                {invoice.status === "void" ? " (void)" : ""}
              </span>
            ))}
          </p>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
