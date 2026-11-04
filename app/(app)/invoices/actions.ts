"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { parseDueDate, parseVoidReason } from "@/lib/invoices";
import {
  createInvoiceFromQuote,
  issueInvoice,
  removeDraftInvoice,
  voidInvoice,
} from "@/lib/data/invoice-writes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createInvoiceFromQuoteAction(
  quoteId: string
): Promise<{ error?: string }> {
  if (!UUID.test(quoteId)) return { error: "That quote could not be found." };

  const supabase = await createClient();
  const result = await createInvoiceFromQuote(supabase, quoteId);
  if (result.error !== undefined) return { error: result.error };

  revalidatePath("/invoices");
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/invoices/${result.id}`);
}

export async function issueInvoiceAction(
  invoiceId: string,
  dueOn: string
): Promise<{ error?: string }> {
  if (!UUID.test(invoiceId)) return { error: "That invoice could not be found." };
  const due = parseDueDate(dueOn);
  if (!due.ok) return { error: due.error };

  const supabase = await createClient();
  const result = await issueInvoice(supabase, invoiceId, due.value);
  if (result.error) return result;

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return {};
}

export async function voidInvoiceAction(
  invoiceId: string,
  reason: string
): Promise<{ error?: string }> {
  if (!UUID.test(invoiceId)) return { error: "That invoice could not be found." };
  const parsed = parseVoidReason(reason);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const result = await voidInvoice(supabase, invoiceId, parsed.value);
  if (result.error) return result;

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return {};
}

export async function deleteInvoiceAction(
  invoiceId: string
): Promise<{ error?: string } | void> {
  if (!UUID.test(invoiceId)) return { error: "That invoice could not be found." };

  const supabase = await createClient();
  const result = await removeDraftInvoice(supabase, invoiceId);
  if (result.error) return result;

  revalidatePath("/invoices");
  redirect("/invoices");
}
