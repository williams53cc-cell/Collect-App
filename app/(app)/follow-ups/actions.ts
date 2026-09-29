"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { parseFollowUpForm } from "@/lib/validation/follow-up";
import { initialFormState, type FormState } from "@/lib/form-state";
import type { FollowUpStatus } from "@/types/database";
import { logCustomerEvent } from "@/lib/data/customer-events";
import {
  followUpCreatedEvent,
  followUpStatusChangedEvent,
  promisedDateClearedEvent,
  promisedDateSetEvent,
} from "@/lib/customer-events";

function revalidateFollowUpPaths(customerId: string) {
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
}

export async function createFollowUp(
  customerId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parseFollowUpForm(formData);
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

  const { error } = await supabase.from("follow_ups").insert({
    user_id: user.id,
    customer_id: customerId,
    reason: parsed.data.reason,
    due_date: parsed.data.due_date,
    status: parsed.data.status,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  await logCustomerEvent(
    supabase,
    customerId,
    followUpCreatedEvent(parsed.data.reason, parsed.data.due_date)
  );

  revalidateFollowUpPaths(customerId);
  return {
    ...initialFormState,
    status: "success",
    message: "Follow-up added.",
  };
}

export async function updateFollowUpStatus(
  followUpId: string,
  customerId: string,
  status: FollowUpStatus
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Fetched before the update so the timeline can say what the status
  // changed FROM — the update below overwrites it, so this has to happen
  // first.
  const { data: existing } = await supabase
    .from("follow_ups")
    .select("status")
    .eq("id", followUpId)
    .maybeSingle();

  const { error } = await supabase
    .from("follow_ups")
    .update({ status })
    .eq("id", followUpId);

  if (error) return { error: error.message };

  if (existing && existing.status !== status) {
    await logCustomerEvent(
      supabase,
      customerId,
      followUpStatusChangedEvent(existing.status, status)
    );
  }

  revalidateFollowUpPaths(customerId);
  return {};
}

export async function setPromisedDate(
  followUpId: string,
  customerId: string,
  promisedDate: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("follow_ups")
    .select("promised_date")
    .eq("id", followUpId)
    .maybeSingle();

  const { error } = await supabase
    .from("follow_ups")
    .update({ promised_date: promisedDate })
    .eq("id", followUpId);

  if (error) return { error: error.message };

  if (existing && existing.promised_date !== promisedDate) {
    await logCustomerEvent(
      supabase,
      customerId,
      promisedDate
        ? promisedDateSetEvent(promisedDate)
        : promisedDateClearedEvent()
    );
  }

  revalidateFollowUpPaths(customerId);
  return {};
}

export async function deleteFollowUp(
  followUpId: string,
  customerId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("id", followUpId);

  if (error) return { error: error.message };

  revalidateFollowUpPaths(customerId);
  return {};
}
