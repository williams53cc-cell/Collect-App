import { createClient } from "@/utils/supabase/server";
import { todayISODate } from "@/lib/format";
import type {
  Database,
  FollowUpStatus,
  PaymentTrigger,
  PaymentType,
} from "@/types/database";

type FollowUpRow = Database["public"]["Tables"]["follow_ups"]["Row"];

export type FollowUpFilterKey =
  | "all"
  | "due-today"
  | "overdue"
  | "pending"
  | "done"
  | "skipped"
  | "promised";

export const FOLLOW_UP_FILTERS: { key: FollowUpFilterKey; label: string }[] =
  [
    { key: "all", label: "All" },
    { key: "overdue", label: "Overdue" },
    { key: "due-today", label: "Due today" },
    { key: "promised", label: "Promised" },
    { key: "pending", label: "Pending" },
    { key: "done", label: "Done" },
    { key: "skipped", label: "Skipped" },
  ];

export interface FollowUpWithCustomer {
  id: string;
  customer_id: string;
  reason: string;
  due_date: string;
  status: FollowUpStatus;
  notes: string | null;
  created_at: string;
  promised_date: string | null;
  customerName: string;
  customerJob: string | null;
  customerAmountOwed: number;
  customerEmail: string | null;
  customerPhone: string | null;
  customerPaymentType: PaymentType | null;
  customerPaymentTrigger: PaymentTrigger | null;
  customerPaymentTriggerNote: string | null;
}

/** Shared by getFollowUps() and getActionableFollowUps() — fetches each
 * follow-up's customer in one batched query (rather than one query per
 * row) and stitches the two together into the flat shape the UI wants. */
async function withCustomerInfo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  followUps: FollowUpRow[]
): Promise<FollowUpWithCustomer[]> {
  if (followUps.length === 0) return [];

  const customerIds = Array.from(
    new Set(followUps.map((followUp) => followUp.customer_id))
  );
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select(
      "id, name, job, amount_owed, email, phone, payment_type, payment_trigger, payment_trigger_note"
    )
    .in("id", customerIds);

  if (customersError) throw new Error(customersError.message);

  const customerById = new Map(
    (customers ?? []).map((customer) => [customer.id, customer])
  );

  return followUps.map((followUp) => {
    const customer = customerById.get(followUp.customer_id);
    return {
      ...followUp,
      customerName: customer?.name ?? "Unknown customer",
      customerJob: customer?.job ?? null,
      customerAmountOwed: customer ? Number(customer.amount_owed) : 0,
      customerEmail: customer?.email ?? null,
      customerPhone: customer?.phone ?? null,
      customerPaymentType: customer?.payment_type ?? null,
      customerPaymentTrigger: customer?.payment_trigger ?? null,
      customerPaymentTriggerNote: customer?.payment_trigger_note ?? null,
    };
  });
}

export async function getFollowUps(
  filter: FollowUpFilterKey = "all"
): Promise<FollowUpWithCustomer[]> {
  const supabase = await createClient();
  const today = todayISODate();

  let query = supabase
    .from("follow_ups")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (filter === "due-today") {
    query = query.eq("status", "pending").eq("due_date", today);
  } else if (filter === "overdue") {
    query = query.eq("status", "pending").lt("due_date", today);
  } else if (
    filter === "pending" ||
    filter === "done" ||
    filter === "skipped"
  ) {
    query = query.eq("status", filter);
  } else if (filter === "promised") {
    query = query.not("promised_date", "is", null);
  }

  const { data: followUps, error } = await query;
  if (error) throw new Error(error.message);

  return withCustomerInfo(supabase, followUps ?? []);
}

/** Every follow-up that still needs the contractor's attention — status
 * "pending" or "needs_call" — with customer info attached, same as
 * getFollowUps(). This is the Dashboard's raw material: lib/dashboard-summary.ts
 * takes this list and boils it down into the summary cards and the "Needs
 * attention" table, purely from each row's own due_date/status/promised_date. */
export async function getActionableFollowUps(): Promise<
  FollowUpWithCustomer[]
> {
  const supabase = await createClient();

  const { data: followUps, error } = await supabase
    .from("follow_ups")
    .select("*")
    .in("status", ["pending", "needs_call"])
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  return withCustomerInfo(supabase, followUps ?? []);
}

export async function getFollowUpsForCustomer(customerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("customer_id", customerId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface FollowUpStats {
  dueTodayCount: number;
  overdueCount: number;
  pendingCount: number;
}

export async function getFollowUpStats(): Promise<FollowUpStats> {
  const supabase = await createClient();
  const today = todayISODate();

  const { data, error } = await supabase
    .from("follow_ups")
    .select("due_date")
    .eq("status", "pending");

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const dueTodayCount = rows.filter((row) => row.due_date === today).length;
  const overdueCount = rows.filter(
    (row) => row.due_date && row.due_date < today
  ).length;

  return { dueTodayCount, overdueCount, pendingCount: rows.length };
}
