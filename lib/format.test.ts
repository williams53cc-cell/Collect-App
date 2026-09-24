import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  daysOverdue,
  isDueToday,
  isOverdue,
  signedDaysFromToday,
  todayISODate,
} from "./format";

/** Fixed reference instant: 8:00 PM on a chosen local calendar day.
 *
 * Built with the local-time `Date` constructor overload (year, month,
 * day, hour, ...), not a UTC ISO string — that's what makes this
 * self-consistent regardless of which timezone the test runner's
 * environment is actually configured for: `getFullYear()`/`getMonth()`/
 * `getDate()` on this instant always read back the same Y/M/D we set it
 * from, in *this* process, whatever its TZ is. An earlier version of this
 * test hardcoded a UTC-8 assumption via a UTC ISO string, which happened
 * to be wrong for the environment these tests actually run in (UTC) and
 * threw every offset off by one day — exactly the class of bug this file
 * exists to catch, just in the test instead of the app. Evening local time
 * still matters here: it's what originally exposed the production bug
 * (`toISOString()` rolling the UTC date over early), so we keep exercising
 * that specific case rather than a timezone-neutral midnight. */
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
  const dt = new Date(y, m - 1, d - n);
  return todayISODateFor(dt);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("todayISODate", () => {
  it("returns the viewer's local calendar date", () => {
    expect(todayISODate()).toBe(TODAY);
  });
});

describe("daysOverdue — tier boundary scenarios", () => {
  it("due today -> 0 days overdue", () => {
    expect(daysOverdue(daysAgo(0))).toBe(0);
  });

  it("due yesterday -> 1 day overdue (the exact reported bug scenario)", () => {
    expect(daysOverdue(daysAgo(1))).toBe(1);
  });

  it("due 5 days ago -> 5 days overdue (top of the friendly range)", () => {
    expect(daysOverdue(daysAgo(5))).toBe(5);
  });

  it("due 6 days ago -> 6 days overdue (bottom of the firm range)", () => {
    expect(daysOverdue(daysAgo(6))).toBe(6);
  });

  it("due 13 days ago -> 13 days overdue (top of the firm range)", () => {
    expect(daysOverdue(daysAgo(13))).toBe(13);
  });

  it("due 14 days ago -> 14 days overdue (bottom of the formal range)", () => {
    expect(daysOverdue(daysAgo(14))).toBe(14);
  });

  it("a future due date is clamped to 0, not negative", () => {
    expect(daysOverdue(daysAgo(-3))).toBe(0);
  });

  it("defensive: a null due date (legacy/pre-migration data) is treated as not overdue, not a crash", () => {
    expect(daysOverdue(null)).toBe(0);
  });
});

describe("isOverdue / isDueToday — tier boundary scenarios", () => {
  it("a pending follow-up due today is due today, not overdue", () => {
    expect(isDueToday(daysAgo(0), "pending")).toBe(true);
    expect(isOverdue(daysAgo(0), "pending")).toBe(false);
  });

  it("a pending follow-up due yesterday is overdue, not due today", () => {
    expect(isOverdue(daysAgo(1), "pending")).toBe(true);
    expect(isDueToday(daysAgo(1), "pending")).toBe(false);
  });

  it("a done follow-up is never overdue or due today, regardless of date", () => {
    expect(isOverdue(daysAgo(30), "done")).toBe(false);
    expect(isDueToday(daysAgo(0), "done")).toBe(false);
  });

  it("a skipped follow-up is never overdue or due today, regardless of date", () => {
    expect(isOverdue(daysAgo(30), "skipped")).toBe(false);
    expect(isDueToday(daysAgo(0), "skipped")).toBe(false);
  });
});

describe
