import type { createClient } from "@/utils/supabase/server";
import type { QuoteInput, QuoteItemInput } from "@/lib/validation/quote";
import type { QuoteStatus } from "@/types/database";

type Client = Awaited<ReturnType<typeof createClient>>;

export type WriteResult = { error: string } | { error?: undefined; id: string };

function itemRows(quoteId: string, items: QuoteItemInput[]) {
  return items.map((item) => ({
    quote_id: quoteId,
    section: item.section,
    stage: item.stage,
    position: item.position,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unit_price,
  }));
}

function headerRow(input: Omit<QuoteInput, "items">) {
  return {
    title: input.title,
    client_name: input.client_name,
    client_phone: input.client_phone,
    client_email: input.client_email,
    client_address: input.client_address,
    customer_id: input.customer_id,
    customer_view: input.customer_view,
    valid_until: input.valid_until,
    notes: input.notes,
    discount_amount: input.discount_amount,
    tax_rate: input.tax_rate,
  };
}

/** Saves a new quote and its lines. If the lines fail, the empty quote is
 * removed again, so you never end up with a quote that has no lines. */
export async function createQuoteWithItems(
  supabase: Client,
  userId: string,
  input: QuoteInput
): Promise<WriteResult> {
  const { items, ...header } = input;

  const { data: created, error } = await supabase
    .from("quotes")
    .insert({ user_id: userId, ...headerRow(header) })
    .select("id")
    .single();
  if (error || !created) {
    return { error: error?.message ?? "Could not save the quote." };
  }

  const { error: itemsError } = await supabase
    .from("quote_items")
    .insert(itemRows(created.id, items));
  if (itemsError) {
    await supabase.from("quotes").delete().eq("id", created.id);
    return { error: itemsError.message };
  }

  return { id: created.id };
}

/** Saves changes to a quote and replaces its lines. Order matters: the new
 * lines are added before the old ones are removed, and if removing the old
 * ones fails the new ones are taken back out. The old lines are therefore
 * never lost. */
export async function updateQuoteWithItems(
  supabase: Client,
  quoteId: string,
  input: QuoteInput
): Promise<WriteResult> {
  const { items, ...header } = input;

  const { data: existing, error: readError } = await supabase
    .from("quote_items")
    .select("id")
    .eq("quote_id", quoteId);
  if (readError) return { error: readError.message };

  const { data: updated, error: updateError } = await supabase
    .from("quotes")
    .update(headerRow(header))
    .eq("id", quoteId)
    .select("id");
  if (updateError) return { error: updateError.message };
  if (!updated || updated.length === 0) {
    return { error: "That quote could not be found." };
  }

  const { data: added, error: addError } = await supabase
    .from("quote_items")
    .insert(itemRows(quoteId, items))
    .select("id");
  if (addError) return { error: addError.message };

  const oldIds = (existing ?? []).map((row) => row.id);
  if (oldIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("quote_items")
      .delete()
      .in("id", oldIds);
    if (deleteError) {
      const newIds = (added ?? []).map((row) => row.id);
      if (newIds.length > 0) {
        await supabase.from("quote_items").delete().in("id", newIds);
      }
      return { error: deleteError.message };
    }
  }

  return { id: quoteId };
}

/** Makes a draft copy of a quote, including all its lines. */
export async function duplicateQuoteWithItems(
  supabase: Client,
  userId: string,
  quoteId: string
): Promise<WriteResult> {
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!quote) return { error: "That quote could not be found." };

  const { data: lines, error: linesError } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("position", { ascending: true });
  if (linesError) return { error: linesError.message };

  const suffix = " (copy)";
  const title =
    quote.title.length + suffix.length > 200
      ? quote.title.slice(0, 200 - suffix.length) + suffix
      : quote.title + suffix;

  const { data: created, error: createError } = await supabase
    .from("quotes")
    .insert({
      user_id: userId,
      customer_id: quote.customer_id,
      title,
      client_name: quote.client_name,
      client_phone: quote.client_phone,
      client_email: quote.client_email,
      client_address: quote.client_address,
      status: "draft",
      currency: quote.currency,
      discount_amount: Number(quote.discount_amount),
      tax_rate: Number(quote.tax_rate),
      customer_view: quote.customer_view,
      valid_until: null,
      notes: quote.notes,
    })
    .select("id")
    .single();
  if (createError || !created) {
    return { error: createError?.message ?? "Could not copy the quote." };
  }

  if (lines && lines.length > 0) {
    const { error: copyError } = await supabase.from("quote_items").insert(
      lines.map((line) => ({
        quote_id: created.id,
        section: line.section,
        stage: line.stage,
        position: line.position,
        description: line.description,
        unit: line.unit,
        quantity: Number(line.quantity),
        unit_price: Number(line.unit_price),
      }))
    );
    if (copyError) {
      await supabase.from("quotes").delete().eq("id", created.id);
      return { error: copyError.message };
    }
  }

  return { id: created.id };
}

export async function setQuoteStatus(
  supabase: Client,
  quoteId: string,
  status: QuoteStatus
): Promise<{ error?: string }> {
  const { data, error } = await supabase
    .from("quotes")
    .update({ status })
    .eq("id", quoteId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "That quote could not be found." };
  return {};
}

export async function removeQuote(
  supabase: Client,
  quoteId: string
): Promise<{ error?: string }> {
  const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
  if (error) return { error: error.message };
  return {};
}
