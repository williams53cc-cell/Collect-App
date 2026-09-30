"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  parseBusinessInfoForm,
  parsePaymentInfoForm,
} from "@/lib/validation/business-profile";
import { initialFormState, type FormState } from "@/lib/form-state";

/** Both actions below upsert on `user_id` rather than insert/update
 * separately — a contractor may be saving either section for the very
 * first time (no business_profiles row exists yet at all) or updating one
 * that already exists, and there's no cheap way to know which from here
 * without an extra round-trip. Postgres's ON CONFLICT DO UPDATE (what
 * Supabase's .upsert() compiles to) handles both in one statement. */

export async function updateBusinessInfo(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const result = parseBusinessInfoForm(formData);

  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      errors[key] = [...(errors[key] ?? []), issue.message];
    }
    return { status: "error", message: "Check the highlighted field.", errors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { business_name, business_type, currency, country, timezone } =
    result.data;

  const { error } = await supabase.from("business_profiles").upsert({
    user_id: user.id,
    business_name,
    business_type,
    currency,
    country: country || null,
    timezone: timezone || null,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return {
    ...initialFormState,
    status: "success",
    message: "Business info saved.",
  };
}

export async function updatePaymentInfo(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const result = parsePaymentInfoForm(formData);

  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      errors[key] = [...(errors[key] ?? []), issue.message];
    }
    return { status: "error", message: "Check the highlighted field.", errors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    payment_method,
    payment_link,
    payment_instructions,
    include_payment_link_default,
  } = result.data;

  const { error } = await supabase.from("business_profiles").upsert({
    user_id: user.id,
    payment_method: payment_method || null,
    payment_link: payment_link || null,
    payment_instructions: payment_instructions || null,
    include_payment_link_default,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return {
    ...initialFormState,
    status: "success",
    message: "Payment info saved.",
  };
}
