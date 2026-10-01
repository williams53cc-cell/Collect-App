import { describe, expect, it } from "vitest";
import { summarizeFollowUps, type ActionableFollowUp } from "./dashboard-summary";

const TODAY = "2026-09-17";

function followUp(overrides: Partial<ActionableFollowUp> & { id: string }): ActionableFollowUp {
  return {
    customer_id: overrides.id, // default: one follow-up per customer unless overridden
    status: "pending",
    due_date: TODAY,
    promised_date: null,
    customerAmountOwed: 0,
    ...overrides,
  };
}

describe("summarizeFollowUps — empty input", () => {
  it("returns a zeroed summary and no attention items", () => {
    const { summary, attentionItems } = summarizeFollowUps([], TODAY);
    expect(summary).toEqual({
      dueToday: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      promised: { customerCount: 0, amount: 0, dueTodayCount: 0 },
      needsCall: { count: 0, amount: 0 },
    });
    expect(attentionItems).toEqual([]);
  });
});

describe("summarizeFollowUps — due today / overdue counting", () => {
  it("counts a pending follow-up due today as due-today, not overdue", () => {
    const { summary, attentionItems } = summarizeFollowUps(
      [followUp({ id: "f1", due_date: TODAY, customerAmountOwed: 500 })],
      TODAY
    );
    expect(summary.dueToday).toEqual({ count: 1, amount: 500 });
    expect(summary.overdue).toEqual({ count: 0, amount: 0 });
    expect(attentionItems).toHaveLength(1);
    expect(attentionItems[0].reason).toBe("due_today");
  });

  it("counts a pending follow-up due before today as overdue, not due-today", () => {
    const { summary, attentionItems } = summarizeFollowUps(
      [followUp({ id: "f1", due_date: "2026-09-10", customerAmountOwed: 400 })],
      TODAY
    );
    expect(summary.overdue).toEqual({ count: 1, amount: 400 });
    expect(summary.dueToday).toEqual({ count: 0, amount: 0 });
    expect(attentionItems[0].reason).toBe("overdue");
  });

  it("ignores done/skipped follow-ups for due-today and overdue, however old the date", () => {
    const { summary, attentionItems } = summarizeFollowUps(
      [
        followUp({ id: "f1", status: "done", due_date: "2026-01-01" }),
        followUp({ id: "f2", status: "skipped", due_date: TODAY }),
      ],
      TODAY
    );
    expect(summary.overdue.count).toBe(0);
    expect(summary.dueToday.count).toBe(0);
    expect(attentionItems).toHaveLength(0);
  });

  it("dedupes dollar amounts by customer within a category, but still counts each follow-up", () => {
    const { summary } = summarizeFollowUps(
      [
        followUp({ id: "f1", customer_id: "c1", due_date: "2026-09-01", customerAmountOwed: 300 }),
        followUp({ id: "f2", customer_id: "c1", due_date: "2026-09-05", customerAmountOwed: 300 }),
      ],
      TODAY
    );
    // Two overdue follow-ups for the same customer -> counted twice, but
    // the $300 balance only added once.
    expect(summary.overdue).toEqual({ count: 2, amount: 300 });
  });
});

describe("summarizeFollowUps — promised to pay", () => {
  it("counts a future promise toward 'promised to pay', excludes a broken one", () => {
    const { summary } = summarizeFollowUps(
      [
        followUp({ id: "f1", customer_id: "c1", promised_date: "2026-09-20", customerAmountOwed: 850 }),
        followUp({ id: "f2", customer_id: "c2", promised_date: "2026-09-01", customerAmountOwed: 1000 }), // broken (in the past)
      ],
      TODAY
    );
    expect(summary.promised).toEqual({
      customerCount: 1,
      amount: 850,
      dueTodayCount: 0,
    });
  });

  it("flags a promise due exactly today separately from the count", () => {
    const { summary, attentionItems } = summarizeFollowUps(
      [followUp({ id: "f1", customer_id: "c1", promised_date: TODAY, customerAmountOwed: 650 })],
      TODAY
    );
    expect(summary.promised).toEqual({
      customerCount: 1,
      amount: 650,
      dueTodayCount: 1,
    });
    expect(attentionItems[0].reason).toBe("promise_due_today");
  });

  it("dedupes promised-to-pay dollars by customer", () => {
    const { summary } = summarizeFollowUps(
      [
        followUp({ id: "f1", customer_id: "c1", promised_date: "2026-09-20", customerAmountOwed: 500 }),
        followUp({ id: "f2", customer_id: "c1", promised_date: "2026-09-25", customerAmountOwed: 500 }),
      ],
      TODAY
    );
    expect(summary.promised.customerCount).toBe(1);
    expect(summary.promised.amount).toBe(500);
  });
});

describe("summarizeFollowUps — needs a call", () => {
  it("counts needs_call follow-ups and dedupes their dollar amount by customer", () => {
    const { summary } = summarizeFollowUps(
      [
        followUp({ id: "f1", customer_id: "c1", status: "needs_call", customerAmountOwed: 900 }),
        followUp({ id: "f2", customer_id: "c1", status: "needs_call", customerAmountOwed: 900 }),
      ],
      TODAY
    );
    expect(summary.needsCall).toEqual({ count: 2, amount: 900 });
  });

  it("a needs_call follow-up with no promise and no overdue due date isn't in the attention list", () => {
    const { attentionItems } = summarizeFollowUps(
      [followUp({ id: "f1", status: "needs_call", due_date: "2099-01-01" })],
      TODAY
    );
    expect(attentionItems).toHaveLength(0);
  });
});

describe("summarizeFollowUps — one row per follow-up, most urgent reason wins", () => {
  it("a broken promise beats an overdue due date on the same follow-up", () => {
    const { attentionItems } = summarizeFollowUps(
      [
        followUp({
          id: "f1",
          due_date: "2026-09-10", // overdue
          promised_date: "2026-09-05", // also broken
        }),
      ],
      TODAY
    );
    expect(attentionItems).toHaveLength(1);
    expect(attentionItems[0].reason).toBe("broke_promise");
  });

  it("a promise due today beats a follow-up merely due today", () => {
    const { attentionItems } = summarizeFollowUps(
      [followUp({ id: "f1", due_date: TODAY, promised_date: TODAY })],
      TODAY
    );
    expect(attentionItems).toHaveLength(1);
    expect(attentionItems[0].reason).toBe("promise_due_today");
  });

  it("sorts the combined list by urgency: broke promise, overdue, promise due today, due today", () => {
    const { attentionItems } = summarizeFollowUps(
      [
        followUp({ id: "due-today", due_date: TODAY }),
        followUp({ id: "overdue", due_date: "2026-09-01" }),
        followUp({ id: "promise-today", due_date: "2099-01-01", promised_date: TODAY }),
        followUp({ id: "broke-promise", due_date: "2099-01-01", promised_date: "2026-01-01" }),
      ],
      TODAY
    );
    expect(attentionItems.map((item) => item.id)).toEqual([
      "broke-promise",
      "overdue",
      "promise-today",
      "due-today",
    ]);
  });
});
