import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getResendClient } from "@/lib/resend";
import { todayISODate } from "@/lib/format";
import { computeDigestsForAllUsers } from "@/lib/digest";
import { buildDigestEmail } from "@/lib/email/daily-digest-email";

// Always run fresh — this reads "today" and must never be served from a
// cache.
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Triggered once a day by Vercel Cron (see vercel.json). For every
 * contractor with at least one pending follow-up due today or overdue,
 * sends a short digest email; contractors with nothing due get nothing,
 * on purpose — see the task description this shipped from.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = todayISODate();

  const { data: followUps, error: followUpsError } = await supabase
    .from("follow_ups")
    .select("user_id, customer_id, due_date")
    .eq("status", "pending")
    .lte("due_date", today);

  if (followUpsError) {
    console.error("daily-digest: failed to load follow-ups", followUpsError);
    return NextResponse.json({ error: followUpsError.message }, { status: 500 });
  }

  if (!followUps || followUps.length === 0) {
    return NextResponse.json({
      sent: 0,
      skipped: 0,
      total: 0,
      message: "Nothing due or overdue for anyone today.",
    });
  }

  const customerIds = Array.from(new Set(followUps.map((row) => row.customer_id)));
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, amount_owed")
    .in("id", customerIds);

  if (customersError) {
    console.error("daily-digest: failed to load customers", customersError);
    return NextResponse.json({ error: customersError.message }, { status: 500 });
  }

  const amountByCustomerId = new Map(
    (customers ?? []).map((customer) => [customer.id, Number(customer.amount_owed)])
  );

  const digests = computeDigestsForAllUsers(followUps, today, amountByCustomerId);

  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/dashboard`;
    const from = process.env.EMAIL_FROM ?? "GripBill <onboarding@resend.dev>";
  const resend = getResendClient();

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const digest of digests) {
    // Reserve today's send slot before doing anything else. If this insert
    // hits the (user_id, digest_date) primary key — meaning a duplicate
    // cron run already sent this user their digest today — skip sending
    // rather than emailing them twice.
    const { error: reserveError } = await supabase
      .from("digest_sends")
      .insert({ user_id: digest.userId, digest_date: today });

    if (reserveError) {
      if (reserveError.code === "23505") {
        skipped++;
        continue;
      }
      console.error("daily-digest: failed to reserve send slot", digest.userId, reserveError);
      errors.push(`${digest.userId}: ${reserveError.message}`);
      continue;
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      digest.userId
    );
    const email = userData?.user?.email;

    if (userError || !email) {
      console.error("daily-digest: no email on file for user", digest.userId, userError);
      errors.push(`${digest.userId}: no email on file`);
      continue;
    }

    const { subject, text, html } = buildDigestEmail({
      dueTodayCount: digest.dueTodayCount,
      overdueCount: digest.overdueCount,
      totalOutstanding: digest.totalOutstanding,
      dashboardUrl,
    });

    const { error: sendError } = await resend.emails.send({
      from,
      to: email,
      subject,
      text,
      html,
    });

    if (sendError) {
      console.error("daily-digest: send failed", digest.userId, sendError);
      errors.push(`${digest.userId}: ${sendError.message}`);
      continue;
    }

    sent++;
  }

  return NextResponse.json({ sent, skipped, total: digests.length, errors });
}
