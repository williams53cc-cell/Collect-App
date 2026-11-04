import type { createClient } from "@/utils/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type InvoiceWriteResult =
  | { error: string }
  | { error?: undefined; id: string };

/** Makes a draft invoice from an accepted quote. The database copies the
 * customer details and every line in one step (all or nothing). */
export async function createInvoiceFromQuote(
  supabase: Client,
  quoteId: string
): Promise<InvoiceWriteResult> {
  const { data, error } = await supabase.rpc("create_invoice_from_quote", {
    p_quote_id: quoteId,
  });
  if (error) return { error: error.message };
  if (!data) return { error: "Could not create the invoice." };
  return { id: data };
}

/** Issues a draft: the database gives it the next invoice number and today's
 * date, and locks it. */
export async function issueInvoice(
  supabase: Client,
  invoiceId: string,
  dueOn: string | null
): Promise<{ error?: string }> {
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "issued", due_on: dueOn })
    .eq("id", invoiceId)
    .eq("status", "draft")
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Only a draft invoice can be issued." };
  }
  return {};
}

/** Cancels an issued invoice. It keeps its number; fix a mistake by making a
 * new invoice. */
export async function voidInvoice(
  supabase: Client,
  invoiceId: string,
  reason: string | null
): Promise<{ error?: string }> {
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "void",
      void_reason: reason,
      voided_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("status", "issued")
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Only an issued invoice can be voided." };
  }
  return {};
}

/** Deletes a draft invoice. Issued and void invoices are never deleted. */
export async function removeDraftInvoice(
  supabase: Client,
  invoiceId: string
): Promise<{ error?: string }> {
  const { data, error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("status", "draft")
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Only a draft invoice can be deleted." };
  }
  return {};
}
