import { formatCurrency } from "@/lib/format";

export interface DigestEmailData {
  dueTodayCount: number;
  overdueCount: number;
  totalOutstanding: number;
  dashboardUrl: string;
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Drops whichever clause is zero, the same way the follow-up message
 * templates drop a missing field, rather than printing "0 overdue". */
function summaryLead(data: DigestEmailData): string {
  const dueTodayClause =
    data.dueTodayCount > 0 ? `${pluralize(data.dueTodayCount, "follow-up")} due today` : null;
  const overdueClause = data.overdueCount > 0 ? `${data.overdueCount} overdue` : null;

  if (dueTodayClause && overdueClause) {
    return `${dueTodayClause} and ${overdueClause}`;
  }
  if (dueTodayClause) {
    return dueTodayClause;
  }
  if (overdueClause) {
    return `${pluralize(data.overdueCount, "follow-up")} overdue`;
  }
  // The caller only builds an email for users with something due/overdue,
  // so this shouldn't be reachable — kept as a safe, honest fallback rather
  // than printing a nonsensical "0 due today and 0 overdue".
  return "Nothing due right now";
}

export function digestSubject(data: DigestEmailData): string {
  const parts = [
    data.dueTodayCount > 0 ? `${data.dueTodayCount} due today` : null,
    data.overdueCount > 0 ? `${data.overdueCount} overdue` : null,
  ].filter((part): part is string => part !== null);

  const summary = parts.length > 0 ? parts.join(", ") : "Follow-up digest";
  return `${summary} — ${formatCurrency(data.totalOutstanding)} outstanding`;
}

export function digestSummarySentence(data: DigestEmailData): string {
  return `${summaryLead(data)} — ${formatCurrency(data.totalOutstanding)} outstanding across all of them.`;
}

export interface DigestEmailContent {
  subject: string;
  text: string;
  html: string;
}

export function buildDigestEmail(data: DigestEmailData): DigestEmailContent {
  const subject = digestSubject(data);
  const summary = digestSummarySentence(data);

  const text = `Good morning,\n\n${summary}\n\nView your dashboard: ${data.dashboardUrl}\n`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
            <tr>
              <td style="padding:32px;">
                                <p style="margin:0 0 16px;font-size:13px;font-weight:600;letter-spacing:0.02em;color:#6b7280;">GripBill</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#111827;">${summary}</p>
                <a href="${data.dashboardUrl}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:500;">View Dashboard</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
