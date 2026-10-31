"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { parseQuoteForm } from "@/lib/validation/quote";
import { QUOTE_STATUSES } from "@/lib/quotes";
import { initialFormState, type FormState } from "@/lib/form-state";
import {
  createQuoteWithItems,
  duplicateQuoteWithItems,
  removeQuote,
  setQuoteStatus,
  updateQuoteWithItems,
} from "@/lib/data/quote-writes";
import type { QuoteStatus } from "@/types/database";

function invalid(
  errors: Record<string, string[]>
): FormState {
  const onlyLines =
    Object.keys(errors).length === 1 && errors.items && errors.items.length > 0;
  return {
    status: "error",
    message: onlyLines ? errors.items[0] : "Check the highlighted fields.",
    errors,
  };
}

export async function createQuote(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parseQuoteForm(formData);
  if (!parsed.success) return invalid(parsed.errors);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await createQuoteWithItems(supabase, user.id, parsed.data);
  if (result.error !== undefined) {
    return { status: "error", message: result.error };
  }

  revalidatePath("/quotes");
  redirect(`/quotes/${result.id}`);
}

export async function updateQuote(
  quoteId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parseQuoteForm(formData);
  if (!parsed.success) return invalid(parsed.errors);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await updateQuoteWithItems(supabase, quoteId, parsed.data);
  if (result.error !== undefined) {
    return { status: "error", message: result.error };
  }

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return { ...initialFormState, status: "success", message: "Quote saved." };
}

export async function duplicateQuote(
  quoteId: string
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await duplicateQuoteWithItems(supabase, user.id, quoteId);
  if (result.error !== undefined) return { error: result.error };

  revalidatePath("/quotes");
  redirect(`/quotes/${result.id}`);
}

export async function updateQuoteStatus(
  quoteId: string,
  status: QuoteStatus
): Promise<{ error?: string }> {
  if (!(QUOTE_STATUSES as readonly string[]).includes(status)) {
    return { error: "Choose a valid status." };
  }

  const supabase = await createClient();
  const result = await setQuoteStatus(supabase, quoteId, status);
  if (result.error) return result;

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return {};
}

export async function deleteQuote(
  quoteId: string
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const result = await removeQuote(supabase, quoteId);
  if (result.error) return result;

  revalidatePath("/quotes");
  redirect("/quotes");
}
