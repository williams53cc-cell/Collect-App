import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database";

type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteItemRow = Database["public"]["Tables"]["quote_items"]["Row"];

export interface QuoteTotalsRow {
  materials_total: number;
  labour_total: number;
  extras_total: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
}

export type QuoteWithTotal = QuoteRow & { total: number };
export type QuoteDetail = QuoteRow & {
  items: QuoteItemRow[];
  totals: QuoteTotalsRow;
};

const ZERO_TOTALS: QuoteTotalsRow = {
  materials_total: 0,
  labour_total: 0,
  extras_total: 0,
  subtotal: 0,
  discount_amount: 0,
  tax_amount: 0,
  total: 0,
};

function numberize(quote: QuoteRow): QuoteRow {
  return {
    ...quote,
    discount_amount: Number(quote.discount_amount),
    tax_rate: Number(quote.tax_rate),
  };
}

/** All of the signed-in contractor's quotes, newest first, each with its
 * total from the database (row-level security keeps this to their own). */
export async function getQuotes(): Promise<QuoteWithTotal[]> {
  const supabase = await createClient();

  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("*")
    .order("quote_number", { ascending: false });
  if (error) throw new Error(error.message);
  if (!quotes || quotes.length === 0) return [];

  const { data: totals, error: totalsError } = await supabase
    .from("quote_totals")
    .select("quote_id, total");
  if (totalsError) throw new Error(totalsError.message);

  const totalById = new Map(
    (totals ?? []).map((row) => [row.quote_id, Number(row.total)])
  );

  return quotes.map((quote) => ({
    ...numberize(quote),
    total: totalById.get(quote.id) ?? 0,
  }));
}

/** One quote with its lines (in order) and its totals, or null. */
export async function getQuote(id: string): Promise<QuoteDetail | null> {
  const supabase = await createClient();

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) return null;

  const { data: items, error: itemsError } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (itemsError) throw new Error(itemsError.message);

  const { data: totals, error: totalsError } = await supabase
    .from("quote_totals")
    .select("*")
    .eq("quote_id", id)
    .maybeSingle();
  if (totalsError) throw new Error(totalsError.message);

  return {
    ...numberize(quote),
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
