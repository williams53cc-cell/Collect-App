import { createClient } from "@/utils/supabase/server";

/** Null when the signed-in contractor hasn't completed onboarding yet —
 * every caller needs to handle that (the dashboard falls back to generic
 * copy, drafted messages skip the business sign-off, and the middleware
 * uses it to decide whether to send someone to /onboarding). Row-level
 * security scopes this to the caller's own row, same as getCustomer() /
 * getCustomers() — no manual .eq("user_id", ...) needed. */
export async function getBusinessProfile() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
