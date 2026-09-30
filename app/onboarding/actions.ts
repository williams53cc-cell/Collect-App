"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  parseOwnerNameForm,
  parseBusinessBasicsForm,
  parseBusinessDetailsForm,
} from "@/lib/validation/onboarding";
import { parsePaymentInfoForm } from "@/lib/validation/business-profile";
import type { FormState } from "@/lib/form-state";

function fieldErrors(
  issues: { path: (string | number)[]; message: string }[]
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0]);
    errors[key] = [...(errors[key] ?? []), issue.message];
  }
  return errors;
}

export async function saveName(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const result = parseOwnerNameForm(formData);
  if (!result.success) {
    return {
      status: "error",
      message: "Check the highlighted field.",
      errors: fieldErrors(result.error.issues),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { first_name, last_name } = result.data;
  const { error } = await supabase.from("business_profiles").upsert({
    user_id: user.id,
    first_name,
    last_name,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/onboarding?step=2");
}

export async function saveBusinessBasics(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const result = parseBusinessBasicsForm(formData);
  if (!result.success) {
    return {
      status: "error",
      message: "Check the highlighted field.",
      errors: fieldErrors(result.error.issues),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { business_name, business_type } = result.data;
  const { error } = await supabase.from("business_profiles").upsert({
    user_id: user.id,
    business_name,
    business_type,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/onboarding?step=3");
}

export async function saveBusinessDetails(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const result = parseBusinessDetailsForm(formData);
  if (!result.success) {
    return {
      status: "error",
      message: "Check the highlighted field.",
      errors: fieldErrors(result.error.issues),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { currency, country, timezone } = result.data;
  const { error } = await supabase.from("business_profiles").upsert({
    user_id: user.id,
    currency,
    country: country || null,
    timezone: timezone || null,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/onboarding?step=4");
}

export async function finishOnboarding(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const result = parsePaymentInfoForm(formData);
  if (!result.success) {
    return {
      status: "error",
      message: "Check the highlighted field.",
      errors: fieldErrors(result.error.issues),
    };
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
    onboarding_completed: true,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/dashboard");
}
