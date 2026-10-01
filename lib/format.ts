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

/** Formats a US-style phone number progressively as the contractor types,
 * so "5551234567" becomes "(555) 123-4567" without them having to type the
 * punctuation themselves — this is what's actually saved, so nothing else
 * needs to reformat it again for display later (customer list, customer
 * detail page, drafted messages). Works off the digit count alone: "555"
 * becomes "(555", "5551234" becomes "(555) 123-4", and so on, so it stays
 * correct no matter where in the number someone is typing or deleting. A
 * leading "1" on an 11-digit number (the US country code, e.g. someone
 * pasting "+1 555 123 4567") is recognized and shown as "+1 (555)
 * 123-4567" instead of being folded into the area code. An 11-digit
 * number that DOESN'T start with "1", or anything longer, isn't a shape
 * this formats — GripBill's contractors are U.S.-based today, so that's
 * left as plain digits rather than forced into a U.S. pattern that would
 * misrepresent it. */
export function formatPhoneAsTyped(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 11 && !digits.startsWith("1")) return digits;

  const hasCountryCode = digits.length === 11;
  const local = hasCountryCode ? digits.slice(1) : digits;
  const prefix = hasCountryCode ? "+1 " : "";

  if (local.length === 0) return "";
  if (local.length <= 3) return `${prefix}(${local}`;
  if (local.length <= 6) {
    return `${prefix}(${local.slice(0, 3)}) ${local.slice(3)}`;
  }
  return `${prefix}(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
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
