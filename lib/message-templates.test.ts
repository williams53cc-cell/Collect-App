import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { daysOverdue } from "./format";
import { MESSAGE_TONES, renderMessage, selectTone } from "./message-templates";

describe("selectTone — exact tier boundaries", () => {
  it("1-5 days overdue -> friendly", () => {
    expect(selectTone(1)).toBe("friendly");
    expect(selectTone(5)).toBe("friendly");
  });

  it("6-13 days overdue -> firm", () => {
    expect(selectTone(6)).toBe("firm");
    expect(selectTone(13)).toBe("firm");
  });

  it("14+ days overdue -> formal", () => {
    expect(selectTone(14)).toBe("formal");
    expect(selectTone(100)).toBe("formal");
  });

  it("0 days (due today / not yet due) -> friendly", () => {
    expect(selectTone(0)).toBe("friendly");
  });
});

describe("end to end: due_date -> daysOverdue -> selectTone", () => {
  // Pinned so these six named scenarios are exact and can't drift with
  // whatever day the suite happens to run on. Built with the local-time
  // Date constructor (not a UTC ISO string) so it's self-consistent
  // regardless of the test runner's configured timezone — see the longer
  // explanation in lib/format.test.ts, which hit this exact pitfall.
  const FIXED_NOW = new Date(2026, 8, 17, 20, 0, 0); // Sept 17, 2026, 8:00 PM local
  const TODAY = todayISODateFor(FIXED_NOW);

  function todayISODateFor(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function daysAgo(n: number): string {
    const [y, m, d] = TODAY.split("-").map(Number);
    return todayISODateFor(new Date(y, m - 1, d - n));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["due today", 0, "friendly"],
    ["due yesterday (1 day)", 1, "friendly"],
    ["due 5 days ago", 5, "friendly"],
    ["due 6 days ago", 6, "firm"],
    ["due 13 days ago", 13, "firm"],
    ["due 14 days ago", 14, "formal"],
  ] as const)("%s -> %s", (_label, n, expectedTone) => {
    const days = daysOverdue(daysAgo(n));
    expect(selectTone(days)).toBe(expectedTone);
  });
});

describe("renderMessage — missing-field handling regression", () => {
  const base = {
    name: "Jordan Smith",
    job: "Kitchen remodel",
    amount: "$1,200.00",
    daysOverdue: 8,
    hasDueDate: true,
    promisedDateLabel: null,
  };

  it("drops the job clause entirely when job is missing, on every tone", () => {
    const noJob = { ...base, job: null };
    expect(renderMessage("friendly", noJob)).not.toMatch(/\bproject\b/);
    expect(renderMessage("firm", noJob)).not.toMatch(/\bproject\b/);
    expect(renderMessage("formal", noJob)).not.toContain("for the");
  });

  it("never renders a bare 'now  days past due' when there's no due date", () => {
    const noDueDate = { ...base, hasDueDate: false, daysOverdue: 0 };
    expect(renderMessage("firm", noDueDate)).not.toMatch(/now\s+\d*\s*days? past due/);
    expect(renderMessage("formal", noDueDate)).not.toMatch(/now\s+\d*\s*days? past due/);
  });

  it("uses singular 'day' for exactly 1 day overdue", () => {
    const oneDay = { ...base, daysOverdue: 1 };
    expect(renderMessage("firm", oneDay)).toContain("1 day past due");
    expect(renderMessage("firm", oneDay)).not.toContain("1 days past due");
  });
});

describe("renderMessage — wording", () => {
  const base = {
    name: "Jordan Smith",
    job: "Kitchen remodel",
    amount: "$1,200.00",
    daysOverdue: 8,
    hasDueDate: true,
    promisedDateLabel: null,
  };

  it("formal no longer claims prior reminders were sent", () => {
    expect(renderMessage("formal", base)).not.toContain(
      "This follows a couple of earlier reminders"
    );
  });

  it("firm and formal ask for a timeframe, not an open-ended 'when'", () => {
    expect(renderMessage("firm", base)).toContain(
      "when we can expect this to be settled, ideally by the end of the week?"
    );
    expect(renderMessage("formal", base)).toContain(
      "when I can expect payment, ideally by the end of the week,"
    );
  });

  it("friendly already used this phrasing and keeps it unchanged", () => {
    expect(renderMessage("friendly", base)).toContain(
      "when I can get this settled, ideally by the end of the week?"
    );
  });

  it("every tone ends with a bare 'Thanks,' on its own line, with no name filled in", () => {
    for (const tone of MESSAGE_TONES) {
      expect(renderMessage(tone, base).endsWith("\n\nThanks,")).toBe(true);
    }
  });
});

describe("renderMessage — promise-aware wording", () => {
  const base = {
    name: "Jordan Smith",
    job: "Kitchen remodel",
    amount: "$1,200.00",
    daysOverdue: 8,
    hasDueDate: true,
  };

  it("quotes the customer's own promised date back to them, on every tone", () => {
    const withPromise = { ...base, promisedDateLabel: "Sep 26, 2026" };
    for (const tone of MESSAGE_TONES) {
      expect(renderMessage(tone, withPromise)).toContain("Sep 26, 2026");
    }
  });

  it("drops the generic 'past due' phrasing once a promise exists", () => {
    const withPromise = { ...base, promisedDateLabel: "Sep 26, 2026" };
    expect(renderMessage("firm", withPromise)).not.toMatch(/past due/);
    expect(renderMessage("formal", withPromise)).not.toMatch(/past due/);
  });

  it("leaves the no-promise wording exactly as before", () => {
    const noPromise = { ...base, promisedDateLabel: null };
    expect(renderMessage("friendly", noPromise)).toContain(
      "friendly reminder"
    );
    expect(renderMessage("firm", noPromise)).toContain("8 days past due");
  });
});

describe("renderMessage — due-soon wording (not yet due)", () => {
  const base = {
    name: "Jordan Smith",
    job: "Kitchen remodel",
    amount: "$1,200.00",
    hasDueDate: true,
    promisedDateLabel: null,
  };

  it("says 'due in N days' instead of 'due today' for a future due date", () => {
    const dueSoon = { ...base, daysOverdue: -3 };
    expect(renderMessage("friendly", dueSoon)).toContain("due in 3 days");
    expect(renderMessage("friendly", dueSoon)).not.toContain("due today");
  });

  it("uses singular 'day' when due in exactly 1 day", () => {
    const dueTomorrow = { ...base, daysOverdue: -1 };
    expect(renderMessage("friendly", dueTomorrow)).toContain("due in 1 day");
    expect(renderMessage("friendly", dueTomorrow)).not.toContain(
      "due in 1 days"
    );
  });

  it("still says 'due today' for a due date of exactly today", () => {
    const dueToday = { ...base, daysOverdue: 0 };
    expect(renderMessage("friendly", dueToday)).toContain("due today");
  });

  it("names the real date and offers to resend the invoice when dueDateLabel is set", () => {
    const dueSoonWithLabel = {
      ...base,
      daysOverdue: -3,
      dueDateLabel: "Oct 9, 2026",
    };
    const message = renderMessage("friendly", dueSoonWithLabel);
    expect(message).toContain("is due on Oct 9, 2026");
    expect(message).toContain("invoice resent");
  });

  it("mentions paying from the invoice details on the due-today message", () => {
    const dueToday = { ...base, daysOverdue: 0 };
    expect(renderMessage("friendly", dueToday)).toContain(
      "using the details on your invoice"
    );
  });
});

describe("renderMessage — disregard-if-paid courtesy line", () => {
  const base = {
    name: "Jordan Smith",
    job: "Kitchen remodel",
    amount: "$1,200.00",
    hasDueDate: true,
    promisedDateLabel: null,
  };

  it("appears once the balance is genuinely overdue, on every tone", () => {
    const overdue = { ...base, daysOverdue: 5 };
    for (const tone of MESSAGE_TONES) {
      expect(renderMessage(tone, overdue)).toContain(
        "If you've already sent payment, please disregard this message."
      );
    }
  });

  it("does not appear for a due-today or not-yet-due reminder", () => {
    const dueToday = { ...base, daysOverdue: 0 };
    const dueSoon = { ...base, daysOverdue: -3 };
    expect(renderMessage("friendly", dueToday)).not.toContain("disregard");
    expect(renderMessage("friendly", dueSoon)).not.toContain("disregard");
  });
});

describe("renderMessage — broken-promise wording", () => {
  const base = {
    name: "Jordan Smith",
    job: "Kitchen remodel",
    amount: "$1,200.00",
    daysOverdue: 1,
    hasDueDate: true,
    promisedDateLabel: "Sep 26, 2026",
  };

  it("asks for an updated date right away, on every tone, once the promise is broken", () => {
    const broken = { ...base, promiseBroken: true };
    for (const tone of MESSAGE_TONES) {
      expect(renderMessage(tone, broken)).toMatch(
        /confirm an updated date/
      );
    }
  });

  it("does not ask for an updated date while the promise hasn't been broken yet", () => {
    const notBroken = { ...base, promiseBroken: false };
    for (const tone of MESSAGE_TONES) {
      expect(renderMessage(tone, notBroken)).not.toMatch(
        /confirm an updated date/
      );
    }
  });

  it("treats a missing promiseBroken flag the same as false, for backward compatibility", () => {
    for (const tone of MESSAGE_TONES) {
      expect(renderMessage(tone, base)).not.toMatch(/confirm an updated date/);
    }
  });
});
