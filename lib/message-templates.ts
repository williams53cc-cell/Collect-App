export const MESSAGE_TONES = ["friendly", "firm", "formal"] as const;
export type MessageTone = (typeof MESSAGE_TONES)[number];

export const MESSAGE_TONE_META: Record<MessageTone, { label: string; description: string }> = {
  friendly: { label: "Friendly", description: "1–5 days overdue" },
  firm: { label: "Firm", description: "6–13 days overdue" },
  formal: { label: "Formal", description: "14+ days overdue" },
};

/** Matches the brief: 1-5 days -> friendly, 6-13 -> firm, 14+ -> formal.
 * Not-yet-due / due-today follow-ups (0 days) fall into the friendly bucket. */
export function selectTone(daysOverdue: number): MessageTone {
  if (daysOverdue >= 14) return "formal";
  if (daysOverdue >= 6) return "firm";
  return "friendly";
}

export interface MessageContext {
  name: string;
  /** null when the customer has no job on file — the job-specific phrase
   * is dropped entirely rather than filled with a placeholder like "project". */
  job: string | null;
  /** Pre-formatted, e.g. "$1,200.00". */
  amount: string;
  /** Signed: positive means overdue, 0 means due today, negative means the
   * due date hasn't arrived yet ("due in 3 days"). Callers that only need
   * the clamped, never-negative version (badges, stats) should keep using
   * daysOverdue() from lib/format — this field wants the real signed value
   * so wording can tell "due soon" apart from "due today". */
  daysOverdue: number;
  /** false when the follow-up has no due date at all — distinct from
   * daysOverdue === 0, which means a due date exists and is today. */
  hasDueDate: boolean;
  /** Pre-formatted (e.g. "Oct 9, 2026"), the actual due date. Optional —
   * when present, the not-yet-due and due-today friendly messages name the
   * real date and offer to resend the invoice, matching how a contractor
   * would phrase it by hand; when absent, they fall back to the shorter
   * "due in N days" phrasing so existing callers keep working unchanged. */
  dueDateLabel?: string | null;
  /** Pre-formatted (e.g. "Sep 26, 2026") and set only once the customer has
   * verbally promised a pay date. When present, that's a stronger signal
   * than our own due_date, so every tone quotes it back to the customer
   * instead of using the generic "past due" phrasing. */
  promisedDateLabel: string | null;
  /** True once a logged promise date has passed without being cleared.
   * Optional (defaults to falsy) so existing callers that don't track this
   * yet keep working unchanged. When true, every tone asks for an updated
   * date right away instead of waiting for the usual overdue thresholds —
   * a broken promise is a stronger signal than a plain missed due date. */
  promiseBroken?: boolean;
}

/** ", due in 3 days" / ", due in 1 day" / ", due today" / ", now 8 days
 * past due" / ", now 1 day past due" / "" (the last when there's no due
 * date on file at all — never renders a bare "now days past due" with no
 * number, and never claims something is "due today" when it's actually
 * still days away). */
function dueDateClause(ctx: MessageContext): string {
  if (!ctx.hasDueDate) return "";
  if (ctx.daysOverdue < 0) {
    const daysUntil = -ctx.daysOverdue;
    const unit = daysUntil === 1 ? "day" : "days";
    return `, due in ${daysUntil} ${unit}`;
  }
  if (ctx.daysOverdue === 0) return ", due today";
  const unit = ctx.daysOverdue === 1 ? "day" : "days";
  return `, now ${ctx.daysOverdue} ${unit} past due`;
}

/** A courtesy line so a message that crosses in the mail with a payment
 * doesn't read as an accusation. Only shown once the balance is genuinely
 * overdue — there's nothing to have "already sent" yet for a due-today or
 * not-yet-due reminder. */
function disregardClause(ctx: MessageContext): string {
  if (!ctx.hasDueDate || ctx.daysOverdue <= 0) return "";
  return "If you've already sent payment, please disregard this message. ";
}

function buildFriendly(ctx: MessageContext): string {
  if (ctx.promisedDateLabel) {
    const jobClause = ctx.job ? ` for the ${ctx.job}` : "";
    if (ctx.promiseBroken) {
      return (
        `Hi ${ctx.name}, I'm following up on the ${ctx.amount} balance${jobClause} — you'd mentioned having this settled by ${ctx.promisedDateLabel}, and we haven't seen it come through yet. ` +
        "Could you confirm an updated date, or let me know if there's an issue I can help sort out?"
      );
    }
    const opening = ctx.job
      ? `Hi ${ctx.name}, hope the ${ctx.job} is looking great! Just checking in`
      : `Hi ${ctx.name}, just checking in`;
    return (
      `${opening} — you'd mentioned having the ${ctx.amount} balance settled by ${ctx.promisedDateLabel}. ` +
      "Could you let me know where things stand? " +
      "Happy to help if there's anything holding it up."
    );
  }
  const jobClause = ctx.job ? ` for the ${ctx.job}` : "";

  // Not yet due, and we have the real date to name — matches how a
  // contractor would actually phrase a heads-up: state the date, offer to
  // resend the paperwork, say thanks. Falls through to the generic
  // "due in N days" wording below when there's no formatted date to use.
  // Same personal, job-referencing opening as the overdue message below, so
  // the voice stays consistent across the whole due-soon -> overdue sequence.
  if (ctx.hasDueDate && ctx.daysOverdue < 0 && ctx.dueDateLabel) {
    const dueSoonOpening = ctx.job
      ? `Hi ${ctx.name}, hope the ${ctx.job} is looking great! Just a friendly reminder`
      : `Hi ${ctx.name}, hope you're well. Just a friendly reminder`;
    return (
      `${dueSoonOpening} that the remaining balance of ${ctx.amount}${jobClause} is due on ${ctx.dueDateLabel}. ` +
      "Please let me know if you need the invoice resent. " +
      "Thank you again for your business."
    );
  }

  // Due today: a plain, low-pressure notice — not an overdue reminder yet.
  if (ctx.hasDueDate && ctx.daysOverdue === 0) {
    const dueTodayOpening = ctx.job
      ? `Hi ${ctx.name}, hope the ${ctx.job} is looking great! Just a quick reminder`
      : `Hi ${ctx.name}, just a quick reminder`;
    return (
      `${dueTodayOpening} that the remaining balance of ${ctx.amount}${jobClause} is due today. ` +
      "You can make payment using the details on your invoice. " +
      "Please let me know if you need anything resent. Thank you."
    );
  }

  const opening = ctx.job
    ? `Hi ${ctx.name}, hope the ${ctx.job} is looking great! Just a friendly reminder`
    : `Hi ${ctx.name}, just a friendly reminder`;
  return (
    `${opening} that the balance of ${ctx.amount} is still outstanding${dueDateClause(ctx)}. ` +
    disregardClause(ctx) +
    "Could you let me know when I can get this settled, ideally by the end of the week? " +
    "Happy to help if there's anything holding it up."
  );
}

function buildFirm(ctx: MessageContext): string {
  const jobClause = ctx.job ? ` for the ${ctx.job} project` : "";
  if (ctx.promisedDateLabel) {
    const promiseJobClause = ctx.job ? ` for the ${ctx.job}` : "";
    if (ctx.promiseBroken) {
      return (
        `Hi ${ctx.name}, following up on the balance of ${ctx.amount}${promiseJobClause} — you'd mentioned having this settled by ${ctx.promisedDateLabel}, and we haven't seen it come through yet. ` +
        "Could you confirm an updated date, or let me know if there's an issue I can help resolve? " +
        "Happy to help if anything's holding it up."
      );
    }
    return (
      `Hi ${ctx.name}, checking in on the balance of ${ctx.amount}${promiseJobClause} — you'd mentioned having this settled by ${ctx.promisedDateLabel}. ` +
      "Could you confirm that's still on track, or let me know if anything's changed? " +
      "Happy to help if anything's holding it up."
    );
  }
  return (
    `Hi ${ctx.name}, this is a follow-up regarding the balance of ${ctx.amount}${jobClause}${dueDateClause(ctx)}. ` +
    disregardClause(ctx) +
    "Could you let me know when we can expect this to be settled, ideally by the end of the week? " +
    "Happy to help if anything's holding it up on your end."
  );
}

function buildFormal(ctx: MessageContext): string {
  const jobClause = ctx.job ? ` for the ${ctx.job}` : "";
  if (ctx.promisedDateLabel) {
    if (ctx.promiseBroken) {
      return (
        `Hi ${ctx.name}, I'm reaching out again regarding the outstanding balance of ${ctx.amount}${jobClause}. ` +
        `You'd mentioned having this settled by ${ctx.promisedDateLabel}, and we haven't seen it come through. ` +
        "I'd like to get this resolved as soon as possible — could you confirm an updated date, or let us know if there's something going on I should know about?"
      );
    }
    return (
      `Hi ${ctx.name}, I'm reaching out regarding the outstanding balance of ${ctx.amount}${jobClause}. ` +
      `You'd mentioned having this settled by ${ctx.promisedDateLabel} — could you confirm that's still the plan, or let me know if anything's changed?`
    );
  }
  return (
    `Hi ${ctx.name}, I'm reaching out again regarding the outstanding balance of ${ctx.amount}${jobClause}${dueDateClause(ctx)}. ` +
    disregardClause(ctx) +
    "I'd like to get this resolved as soon as possible — could you let me know when I can expect payment, ideally by the end of the week, or reach out if there's something going on I should know about?"
  );
}

const BUILDERS: Record<MessageTone, (ctx: MessageContext) => string> = {
  friendly: buildFriendly,
  firm: buildFirm,
  formal: buildFormal,
};

/** Every message ends with a bare "Thanks," on its own line so the sender
 * can type their own name after it — there's no sender-name field in the
 * app to fill this in automatically. */
export function renderMessage(tone: MessageTone, ctx: MessageContext): string {
  return `${BUILDERS[tone](ctx)}\n\nThanks,`;
}
