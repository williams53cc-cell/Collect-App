import { createClient } from "@/utils/supabase/server";
import { todayISODate } from "@/lib/format";
import type { FollowUpStatus } from "@/types/database";

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
  if (!followUps || followUps.length === 0) return [];

  const customerIds = Array.from(
    new Set(followUps.map((followUp) => followUp.customer_id))
  );
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, job, amount_owed, email, phone")
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
    };
  });
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
