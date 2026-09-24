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
  daysOverdue: number;
  /** false when the follow-up has no due date at all — distinct from
   * daysOverdue === 0, which means a due date exists and is today. */
  hasDueDate: boolean;
  /** Pre-formatted (e.g. "Sep 26, 2026") and set only once the customer has
   * verbally promised a pay date. When present, that's a stronger signal
   * than our own due_date, so every tone quotes it back to the customer
   * instead of using the generic "past due" phrasing. */
  promisedDateLabel: string | null;
}

/** ", now 8 days past due" / ", now 1 day past due" / ", due today" / ""
 * (the last when there's no due date on file at all — never renders a
 * bare "now days past due" with no number). */
function dueDateClause(ctx: MessageContext): string {
  if (!ctx.hasDueDate) return "";
  if (ctx.daysOverdue <= 0) return ", due today";
  const unit = ctx.daysOverdue === 1 ? "day" : "days";
  return `, now ${ctx.daysOverdue} ${unit} past due`;
}

function buildFriendly(ctx: MessageContext): string {
  if (ctx.promisedDateLabel) {
    const opening = ctx.job
      ? `Hi ${ctx.name}, hope the ${ctx.job} is looking great! Just checking in`
      : `Hi ${ctx.name}, just checking in`;
    return (
      `${opening} — you'd mentioned having the ${ctx.amount} balance settled by ${ctx.promisedDateLabel}. ` +
      "Could you let me know where things stand? " +
      "Happy to help if there's anything holding it up."
    );
  }
  const opening = ctx.job
    ? `Hi ${ctx.name}, hope the ${ctx.job} is looking great! Just a friendly reminder`
    : `Hi ${ctx.name}, just a friendly reminder`;
  return (
    `${opening} that the balance of ${ctx.amount} is still outstanding. ` +
    "Could you let me know when I can get this settled, ideally by the end of the week? " +
    "Happy to help if there's anything holding it up."
  );
}

function buildFirm(ctx: MessageContext): string {
  const jobClause = ctx.job ? ` for the ${ctx.job} project` : "";
  if (ctx.promisedDateLabel) {
    return (
      `Hi ${ctx.name}, following up on the balance of ${ctx.amount}${jobClause} — you'd mentioned having this settled by ${ctx.promisedDateLabel}, which has now passed. ` +
      "Could you let me know when I can expect this, or reach out if something's changed on your end? " +
      "Happy to help if anything's holding it up."
    );
  }
  return (
    `Hi ${ctx.name}, this is a follow-up regarding the balance of ${ctx.amount}${jobClause}${dueDateClause(ctx)}. ` +
    "Could you let me know when we can expect this to be settled, ideally by the end of the week? " +
    "Happy to help if anything's holding it up on your end."
  );
}

function buildFormal(ctx: MessageContext): string {
  const jobClause = ctx.job ? ` for the ${ctx.job}` : "";
  if (ctx.promisedDateLabel) {
    return (
      `Hi ${ctx.name}, I'm reaching out again regarding the outstanding balance of ${ctx.amount}${jobClause}. ` +
      `You'd mentioned having this settled by ${ctx.promisedDateLabel}, which has now passed. ` +
      "I'd like to get this resolved as soon as possible — could you let me know when I can expect payment, or reach out if there's something going on I should know about?"
    );
  }
  return (
    `Hi ${ctx.name}, I'm reaching out again regarding the outstanding balance of ${ctx.amount}${jobClause}${dueDateClause(ctx)}. ` +
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
