"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";    
import { createClient } from "@/utils/supabase/server";
import { parseFollowUpForm } from "@/lib/validation/follow-up";
import { initialFormState, type FormState } from "@/lib/form-state";
import type { FollowUpStatus } from "@/types/database";

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
  const { error } = await supabase
    .from("follow_ups")
    .update({ status })
    .eq("id", followUpId);

  if (error) return { error: error.message };

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
