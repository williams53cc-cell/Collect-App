import type { InvoiceStatus } from "@/types/database";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  void: "Void",
};

/** INV-0007 style number. A draft has no number yet, so it shows "Draft". */
export function formatInvoiceNumber(invoiceNumber: number | null): string {
  if (invoiceNumber === null || invoiceNumber === undefined) return "Draft";
  return `INV-${String(invoiceNumber).padStart(4, "0")}`;
}

/** The date `days` after a YYYY-MM-DD date, as YYYY-MM-DD. Used to suggest
 * a due date when an invoice is issued. */
export function addDaysISO(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Checks the due date typed when issuing an invoice. Empty is fine (no due
 * date). Otherwise it must be a real YYYY-MM-DD date. */
export function parseDueDate(
  value: string | null | undefined
): { ok: true; value: string | null } | { ok: false; error: string } {
  const text = (value ?? "").trim();
  if (text === "") return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return { ok: false, error: "Enter a valid due date." };
  }
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false, error: "Enter a valid due date." };
  }
  return { ok: true, value: text };
}

/** Checks the reason typed when voiding an invoice. Optional, trimmed, and
 * limited to 500 characters. */
export function parseVoidReason(
  value: string | null | undefined
): { ok: true; value: string | null } | { ok: false; error: string } {
  const text = (value ?? "").trim();
  if (text.length > 500) {
    return { ok: false, error: "The reason is too long (500 characters max)." };
  }
  return { ok: true, value: text === "" ? null : text };
}

const quantityFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

/** A line quantity the way a person writes it: 1.5, 5,000, 0.125. */
export function formatLineQuantity(quantity: number): string {
  return quantityFormat.format(quantity);
}
