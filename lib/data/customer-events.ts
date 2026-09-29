import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import type { CustomerEventContent } from "@/lib/customer-events";
import type { Database } from "@/types/database";

export interface CustomerEvent {
  id: string;
  headline: string;
  detail: string;
  created_at: string;
}

/** Newest first — matches how the timeline reads: the most recent thing
 * that happened sits at the top. */
export async function getCustomerEvents(
  customerId: string
): Promise<CustomerEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_events")
    .select("id, headline, detail, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Records one entry in a customer's payment timeline. Takes an
 * already-open Supabase client so it can be called from inside a server
 * action that's already doing other writes, without opening a second
 * connection. user_id isn't passed explicitly — the customer_events table
 * defaults it to auth.uid(), same as customers and follow_ups.
 *
 * Failures are logged, not thrown: a timeline entry is a record of
 * something that already happened, so if it can't be saved that's never a
 * reason to fail or roll back the actual change (a due date, a status) it
 * describes.
 */
export async function logCustomerEvent(
  supabase: SupabaseClient<Database>,
  customerId: string,
  content: CustomerEventContent
): Promise<void> {
  const { error } = await supabase.from("customer_events").insert({
    customer_id: customerId,
    headline: content.headline,
    detail: content.detail,
  });

  if (error) {
    console.error("Failed to log customer event:", error.message);
  }
}
