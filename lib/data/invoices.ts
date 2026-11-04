import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type InvoiceItemRow = Database["public"]["Tables"]["invoice_items"]["Row"];

export interface InvoiceTotalsRow {
  materials_total: number;
  labour_total: number;
  extras_total: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
}

export type InvoiceWithTotal = InvoiceRow & { total: number };
export type InvoiceDetail = InvoiceRow & {
  items: InvoiceItemRow[];
  totals: InvoiceTotalsRow;
};

const ZERO_TOTALS: InvoiceTotalsRow = {
  materials_total: 0,
  labour_total: 0,
  extras_total: 0,
  subtotal: 0,
  discount_amount: 0,
  tax_amount: 0,
  total: 0,
};

function numberize(invoice: InvoiceRow): InvoiceRow {
  return {
    ...invoice,
    discount_amount: Number(invoice.discount_amount),
    tax_rate: Number(invoice.tax_rate),
  };
}

/** All of the signed-in contractor's invoices, newest first (drafts, which
 * have no number yet, come first), each with its total from the database. */
export async function getInvoices(): Promise<InvoiceWithTotal[]> {
  const supabase = await createClient();

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!invoices || invoices.length === 0) return [];

  const { data: totals, error: totalsError } = await supabase
    .from("invoice_totals")
    .select("invoice_id, total");
  if (totalsError) throw new Error(totalsError.message);

  const totalById = new Map(
    (totals ?? []).map((row) => [row.invoice_id, Number(row.total)])
  );

  return invoices.map((invoice) => ({
    ...numberize(invoice),
    total: totalById.get(invoice.id) ?? 0,
  }));
}

/** The invoices made from one quote, newest first. */
export async function getInvoicesForQuote(
  quoteId: string
): Promise<Pick<InvoiceRow, "id" | "invoice_number" | "status">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, status")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** One invoice with its lines (in order) and its totals, or null. */
export async function getInvoice(id: string): Promise<InvoiceDetail | null> {
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!invoice) return null;

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (itemsError) throw new Error(itemsError.message);

  const { data: totals, error: totalsError } = await supabase
    .from("invoice_totals")
    .select("*")
    .eq("invoice_id", id)
    .maybeSingle();
  if (totalsError) throw new Error(totalsError.message);

  return {
    ...numberize(invoice),
    items: (items ?? []).map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      amount: Number(item.amount),
    })),
    totals: totals
      ? {
          materials_total: Number(totals.materials_total),
          labour_total: Number(totals.labour_total),
          extras_total: Number(totals.extras_total),
          subtotal: Number(totals.subtotal),
          discount_amount: Number(totals.discount_amount),
          tax_amount: Number(totals.tax_amount),
          total: Number(totals.total),
        }
      : ZERO_TOTALS,
  };
}
