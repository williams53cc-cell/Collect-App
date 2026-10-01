/** Pure computation for the Dashboard's summary cards and "Needs
 * attention" list — no Supabase, no I/O, so it's cheap to unit-test
 * exhaustively. The caller fetches every "actionable" follow-up (status
 * pending or needs_call — see getActionableFollowUps()) and hands the
 * list here. This only ever reads data GripBill already tracks (the
 * follow-up's own due date and status, plus the promise date already
 * stored by PromisedDateControl) — it doesn't add any new fields,
 * tables, or data-entry step. */

export interface ActionableFollowUp {
  id: string;
  customer_id: string;
  status: string;
  due_date: string;
  promised_date: string | null;
  customerAmountOwed: number;
}

export type AttentionReason =
  | "broke_promise"
  | "overdue"
  | "promise_due_today"
  | "due_today";

export interface DashboardSummary {
  dueToday: { count: number; amount: number };
  overdue: { count: number; amount: number };
  promised: { customerCount: number; amount: number; dueTodayCount: number };
  needsCall: { count: number; amount: number };
}

// Most urgent first — also the order rows appear in on the Dashboard's
// "Needs attention" list.
const REASON_PRIORITY: AttentionReason[] = [
  "broke_promise",
  "overdue",
  "promise_due_today",
  "due_today",
];

/**
 * A single follow-up can match more than one reason at once — e.g. a
 * promise that broke AND a due date that's overdue. Rather than list it
 * twice, each row gets exactly one reason: whichever is most urgent (see
 * REASON_PRIORITY above).
 *
 * Dollar amounts dedupe by customer *within* each category, so a customer
 * with two overdue follow-ups doesn't double their balance in the
 * "Overdue" card. Totals *across* different cards can still overlap with
 * each other — the same balance can count toward both "Money outstanding"
 * and "Overdue follow-ups" — and that's expected, not a bug; the
 * Dashboard says so under the cards.
 */
export function summarizeFollowUps<T extends ActionableFollowUp>(
  followUps: T[],
  today: string
): {
  summary: DashboardSummary;
  attentionItems: (T & { reason: AttentionReason })[];
} {
  let dueTodayCount = 0;
  let overdueCount = 0;
  let needsCallCount = 0;
  let promisedDueTodayCount = 0;

  let dueTodayAmount = 0;
  let overdueAmount = 0;
  let needsCallAmount = 0;
  let promisedAmount = 0;

  const dueTodayCustomers = new Set<string>();
  const overdueCustomers = new Set<string>();
  const needsCallCustomers = new Set<string>();
  const promisedCustomers = new Set<string>();

  const attentionItems: (T & { reason: AttentionReason })[] = [];

  for (const followUp of followUps) {
    const isBrokenPromise =
      !!followUp.promised_date && followUp.promised_date < today;
    const isPromiseDueToday = followUp.promised_date === today;
    const isPendingOverdue =
      followUp.status === "pending" && followUp.due_date < today;
    const isPendingDueToday =
      followUp.status === "pending" && followUp.due_date === today;

    if (followUp.promised_date && !isBrokenPromise) {
      if (isPromiseDueToday) promisedDueTodayCount++;
      if (!promisedCustomers.has(followUp.customer_id)) {
        promisedCustomers.add(followUp.customer_id);
        promisedAmount += followUp.customerAmountOwed;
      }
    }

    if (followUp.status === "needs_call") {
      needsCallCount++;
      if (!needsCallCustomers.has(followUp.customer_id)) {
        needsCallCustomers.add(followUp.customer_id);
        needsCallAmount += followUp.customerAmountOwed;
      }
    }

    if (isPendingOverdue) {
      overdueCount++;
      if (!overdueCustomers.has(followUp.customer_id)) {
        overdueCustomers.add(followUp.customer_id);
        overdueAmount += followUp.customerAmountOwed;
      }
    }

    if (isPendingDueToday) {
      dueTodayCount++;
      if (!dueTodayCustomers.has(followUp.customer_id)) {
        dueTodayCustomers.add(followUp.customer_id);
        dueTodayAmount += followUp.customerAmountOwed;
      }
    }

    let reason: AttentionReason | null = null;
    if (isBrokenPromise) reason = "broke_promise";
    else if (isPendingOverdue) reason = "overdue";
    else if (isPromiseDueToday) reason = "promise_due_today";
    else if (isPendingDueToday) reason = "due_today";

    if (reason) attentionItems.push({ ...followUp, reason });
  }

  attentionItems.sort(
    (a, b) =>
      REASON_PRIORITY.indexOf(a.reason) - REASON_PRIORITY.indexOf(b.reason)
  );

  return {
    summary: {
      dueToday: { count: dueTodayCount, amount: dueTodayAmount },
      overdue: { count: overdueCount, amount: overdueAmount },
      promised: {
        customerCount: promisedCustomers.size,
        amount: promisedAmount,
        dueTodayCount: promisedDueTodayCount,
      },
      needsCall: { count: needsCallCount, amount: needsCallAmount },
    },
    attentionItems,
  };
}
