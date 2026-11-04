import type { InvoiceDetail } from "@/lib/data/invoices";
import { formatInvoiceNumber } from "@/lib/invoices";
import type { Database } from "@/types/database";
import { formatPdfDate, type InvoicePdfInput } from "./quote-pdf";

type BusinessProfile = Database["public"]["Tables"]["business_profiles"]["Row"];

const orNull = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** The "How to pay" text: the contractor's own payment details, then a
 * line with the due date and the number to use as the payment reference. */
function howToPay(
  instructions: string | null,
  number: string,
  dueOn: string | null
): string {
  const lines: string[] = [];
  if (instructions) lines.push(instructions);
  const due = dueOn ? `Payment is due by ${formatPdfDate(dueOn)}. ` : "";
  lines.push(`${due}Please use ${number} as your payment reference.`);
  return lines.join("\n\n");
}

/** Turns a saved invoice and the contractor's business profile into what
 * the PDF builder needs. Amounts come straight from the database view, so
 * the PDF always shows the same numbers as the screen. Only an issued or
 * cancelled invoice has a PDF: a draft has no number yet, so this returns
 * null for it. */
export function toInvoicePdfInput(
  invoice: InvoiceDetail,
  profile: BusinessProfile | null
): InvoicePdfInput | null {
  if (invoice.status === "draft") return null;
  return {
    business: {
      name: profile?.business_name?.trim() ?? "",
      phone: orNull(profile?.business_phone),
      email: orNull(profile?.business_email),
      address: orNull(profile?.business_address),
      terms: null,
      paymentInstructions: howToPay(
        orNull(profile?.payment_instructions),
        formatInvoiceNumber(invoice.invoice_number),
        invoice.due_on
      ),
    },
    invoice: {
      number: formatInvoiceNumber(invoice.invoice_number),
      title: invoice.title,
      issuedOn: invoice.issued_on ?? invoice.created_at,
      dueOn: invoice.due_on,
      status: invoice.status,
      clientName: invoice.client_name,
      clientPhone: orNull(invoice.client_phone),
      clientEmail: orNull(invoice.client_email),
      jobAddress: orNull(invoice.client_address),
      currency: invoice.currency,
      customerView: invoice.customer_view,
      notes: orNull(invoice.notes),
      taxRate: invoice.tax_rate,
      totals: {
        materials: invoice.totals.materials_total,
        labour: invoice.totals.labour_total,
        extras: invoice.totals.extras_total,
        subtotal: invoice.totals.subtotal,
        discount: invoice.totals.discount_amount,
        tax: invoice.totals.tax_amount,
        total: invoice.totals.total,
      },
      items: invoice.items.map((item) => ({
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
