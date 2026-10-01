import { getCustomerStats } from "@/lib/data/customers";
import { getActionableFollowUps } from "@/lib/data/follow-ups";
import { summarizeFollowUps } from "@/lib/dashboard-summary";
import { todayISODate } from "@/lib/format";

export async function getDashboardData() {
  const [customerStats, followUps] = await Promise.all([
    getCustomerStats(),
    getActionableFollowUps(),
  ]);

  const { summary, attentionItems } = summarizeFollowUps(
    followUps,
    todayISODate()
  );

  return {
    customerStats,
    summary,
    // Sorted most-urgent-first by summarizeFollowUps(); capped so the
    // dashboard stays scannable even with a long list.
    attentionFollowUps: attentionItems.slice(0, 10),
  };
}
