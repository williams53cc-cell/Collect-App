"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { parseBusinessContactForm } from "@/lib/validation/business-contact";
import { initialFormState, type FormState } from "@/lib/form-state";

/** Saves the details that appear on the quote PDF. Upserts on `user_id`
 * for the same reason as the other settings actions: the contractor may
 * be saving here before any other section. */
export async function updateBusinessContact(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const result = parseBusinessContactForm(formData);

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

  const { business_phone, business_email, business_address, quote_terms } =
    result.data;

  const { error } = await supabase.from("business_profiles").upsert({
    user_id: user.id,
    business_phone: business_phone || null,
    business_email: business_email || null,
    business_address: business_address || null,
    quote_terms: quote_terms || null,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/settings");
  return {
    ...initialFormState,
    status: "success",
    message: "Business details saved.",
  };
}
