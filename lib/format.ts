const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** `value` is a `date` column value (YYYY-MM-DD), not a full timestamp.
 *
 * This and the due-date helpers below deliberately keep accepting
 * `string | null` even though `follow_ups.due_date` is now NOT NULL end to
 * end (DB constraint + required Zod validation + required form field — see
 * migration 0002 and lib/validation/follow-up.ts). TypeScript's types are a
 * compile-time contract, not a runtime guarantee: a row saved before that
 * constraint existed, or written by something outside this app entirely,
 * could still hand these functions a null at runtime no matter what the
 * type says. These are the lowest-level functions where that data enters
 * the app's date math, so this is where a defensive null check is cheapest
 * and most valuable — one guard here beats every caller re-deriving the
 * same guess. Everywhere else in the app, `due_date` is typed as a plain
 * `string`, so callers get a real compile error if they try to treat it as
 * possibly missing. */
export function formatDate(value: string | null): string {
  if (!value) return "—";
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

/** Today's date as YYYY-MM-DD, in the viewer's local calendar day — matching
 * what a person actually means by "today" (and what they typed into a plain
 * `<input type="date">`). Deliberately uses local getters, not
 * `toISOString()`: that converts to UTC, which silently rolls over to the
 * next (or previous) calendar day for hours at a time on any device that
 * isn't in the UTC timezone, throwing every overdue calculation off by a
 * day for large parts of the day. */
export function todayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isOverdue(dueDate: string | null, status: string): boolean {
  return status === "pending" && !!dueDate && dueDate < todayISODate();
}

export function isDueToday(dueDate: string | null, status: string): boolean {
  return status === "pending" && dueDate === todayISODate();
}

function toUTCDayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/** Days between `dueDate` and today, clamped to 0 for dates that aren't past yet. */
export function daysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const diff = toUTCDayNumber(todayISODate()) - toUTCDayNumber(dueDate);
  return Math.max(0, Math.round(diff));
}

/** Same math as daysOverdue(), but NOT clamped: positive when `date` is in
 * the past, negative when it's still upcoming, 0 when it's today. Badges
 * and stats want the clamped version (a not-yet-due follow-up isn't
 * "-3 days overdue" for a status pill) so they should keep using
 * daysOverdue(). Message wording wants this one, so it can say "due in 3
 * days" instead of silently treating every future date as "due today". */
export function signedDaysFromToday(date: string | null): number {
  if (!date) return 0;
  const diff = toUTCDayNumber(todayISODate()) - toUTCDayNumber(date);
  return Math.round(diff);
}
