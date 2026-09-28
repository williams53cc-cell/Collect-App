"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { normalizePaypalUsername } from "@/lib/paypal";
import { initialFormState, type FormState } from "@/lib/form-state";

export async function updatePaypalUsername(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = String(formData.get("paypal_username") ?? "");
  const username = normalizePaypalUsername(raw);

  if (username.length > 50) {
    return {
      status: "error",
      message: "Check the highlighted field.",
      errors: {
        paypal_username: ["That doesn't look like a valid PayPal.me username."],
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({
    data: { paypal_username: username || null },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/settings");
  return {
    ...initialFormState,
    status: "success",
    message: username ? "PayPal link saved." : "PayPal link removed.",
  };
}
