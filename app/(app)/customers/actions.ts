"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { parseCustomerForm } from "@/lib/validation/customer";
import { initialFormState, type FormState } from "@/lib/form-state";
import type { CustomerStatus } from "@/types/database";
import { logCustomerEvent } from "@/lib/data/customer-events";
import {
  amountOwedChangedEvent,
  customerAddedEvent,
} from "@/lib/customer-events";

export async function createCustomer(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      job: parsed.data.job || null,
      amount_owed: parsed.data.amount_owed,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    return { status: "error", message: error.message };
  }

  await logCustomerEvent(
    supabase,
    created.id,
    customerAddedEvent(parsed.data.amount_owed, parsed.data.job || null)
  );

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ...initialFormState, status: "success", message: "Customer added." };
}

/** Full edit — name, contact, job, amount owed, status, and notes — as
 * opposed to updateCustomerStatus() below, which only ever touches status
 * from the quick dropdown on the customer detail page. Before this, there
 * was no way to fix a customer's contact or job after creating them; this
 * is what backs the "Edit" dialog on the customer detail page. */
export async function updateCustomer(
  customerId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  // Fetched before the update so the timeline can say what the amount
  // changed FROM — the update below overwrites it, so this has to happen
  // first.
  const { data: existing } = await supabase
    .from("customers")
    .select("amount_owed")
    .eq("id", customerId)
    .maybeSingle();

  const { error } = await supabase
    .from("customers")
    .update({
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      job: parsed.data.job || null,
      amount_owed: parsed.data.amount_owed,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    })
    .eq("id", customerId);

  if (error) {
    return { status: "error", message: error.message };
  }

  if (existing && Number(existing.amount_owed) !== parsed.data.amount_owed) {
    await logCustomerEvent(
      supabase,
      customerId,
      amountOwedChangedEvent(Number(existing.amount_owed), parsed.data.amount_owed)
    );
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/dashboard");
  return { ...initialFormState, status: "success", message: "Customer updated." };
}

export async function updateCustomerStatus(
  customerId: string,
  status: CustomerStatus
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ status })
    .eq("id", customerId);

  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function deleteCustomer(
  customerId: string
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId);

  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  redirect("/customers");
}
