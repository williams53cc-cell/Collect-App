/** Helpers for sharing a quote or an invoice on WhatsApp. */

/** Turns a phone number as typed into the digits WhatsApp wants (country
 * code first, no plus or spaces). A 10-digit number is treated as a
 * Jamaican / North American number and gets a leading 1. Returns null when
 * there are too few digits to be a real number. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) return `1${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

const moneyFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** The short message that goes with the PDF. */
export function quoteShareMessage(details: {
  clientName: string;
  quoteLabel: string;
  title: string;
  total: number;
  currency: string;
  businessName?: string | null;
}): string {
  const from = details.businessName?.trim()
    ? ` from ${details.businessName.trim()}`
    : "";
  return (
    `Hi ${details.clientName}, here is quote ${details.quoteLabel} for ` +
    `${details.title}${from}. Total: ${details.currency} ` +
    `${moneyFormat.format(details.total)}. ` +
    `Please let me know if you have any questions.`
  );
}

/** The short message that goes with the invoice PDF. */
export function invoiceShareMessage(details: {
  clientName: string;
  invoiceLabel: string;
  title: string;
  total: number;
  currency: string;
  dueOn?: string | null;
  businessName?: string | null;
}): string {
  const from = details.businessName?.trim()
    ? ` from ${details.businessName.trim()}`
    : "";
  const due = details.dueOn ? ` Payment is due by ${details.dueOn}.` : "";
  return (
    `Hi ${details.clientName}, here is invoice ${details.invoiceLabel} for ` +
    `${details.title}${from}. Total: ${details.currency} ` +
    `${moneyFormat.format(details.total)}.${due} ` +
    `Payment details are on the invoice. Thank you.`
  );
}

/** A link that opens WhatsApp with the message ready. With a phone number
 * it opens that chat; without one WhatsApp lets you pick who to send to. */
export function whatsappLink(
  phone: string | null | undefined,
  message: string
): string {
  const number = whatsappNumber(phone);
  const text = encodeURIComponent(message);
  return number
    ? `https://wa.me/${number}?text=${text}`
    : `https://wa.me/?text=${text}`;
}
