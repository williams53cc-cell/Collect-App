# GripBill

A small Next.js + Supabase SaaS for tracking who owes you money and following up.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth + Postgres) via `@supabase/ssr`
- Zod for form validation
- Resend for the daily digest email, triggered by Vercel Cron

## Setup

1. Create a Supabase project at https://supabase.com.
2. Run the SQL in `supabase/migrations/` **in order** (`0001`, `0002`,
   `0003`) in the Supabase SQL editor, or via the Supabase CLI
   (`supabase db push`, which applies them in order automatically):
   - `0001_init.sql` creates `customers` and `follow_ups` with row-level
     security so each user only sees their own data.
   - `0002_follow_ups_due_date_required.sql` makes `follow_ups.due_date`
     `NOT NULL` (backfilling any existing rows to their creation date
     first, so it's safe to run on a database that already has data).
   - `0003_digest_sends.sql` adds the table the daily digest cron uses to
     avoid emailing the same person twice in one day.
3. In your Supabase project, under Authentication → Providers, make sure
   Email is enabled. For local dev you can disable "Confirm email" to skip
   the email step, or configure an SMTP provider to receive confirmation
   links.
4. Copy `.env.local.example` to `.env.local` and fill in your project's URL
   and anon key (Project Settings → API):

   ```bash
   cp .env.local.example .env.local
   ```

5. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

6. Visit `http://localhost:3000`, sign up with an email/password, then
   confirm the account (if email confirmation is enabled) and sign in.

### Daily digest email (optional, for production)

The digest cron endpoint works without any of this configured — it'll just
fail cleanly with a clear error if `RESEND_API_KEY` or
`SUPABASE_SERVICE_ROLE_KEY` are missing when it runs, rather than sending
nothing silently or crashing. To actually enable it:

1. Get a free Resend API key at https://resend.com (100 emails/day, no card
   required) and set `RESEND_API_KEY`.
2. From your Supabase project, Project Settings → API → grab the
   **service_role** key and set `SUPABASE_SERVICE_ROLE_KEY`. This key
   bypasses row-level security — never expose it to the browser, never
   prefix it with `NEXT_PUBLIC_`, and it's only ever used inside
   `app/api/cron/daily-digest/route.ts`.
3. Set `NEXT_PUBLIC_SITE_URL` to your deployed URL (used to build the "View
   Dashboard" link in the email).
4. Generate a random `CRON_SECRET` (e.g. `openssl rand -hex 32`) and set it
   both in your environment and as an environment variable on your Vercel
   project. Vercel automatically sends it as
   `Authorization: Bearer $CRON_SECRET` on every request it makes to a
   `vercel.json` cron path when that exact env var is set, which is what
   `app/api/cron/daily-digest/route.ts` checks — anyone else hitting the URL
   gets a 401.
5. Deploy to Vercel. `vercel.json` schedules the cron for `0 12 * * *`
   (12:00 UTC — roughly 8am US Eastern / 5am US Pacific). **Caveat:** Vercel
   Cron runs on a single fixed UTC schedule for the whole app; there's no
   per-user timezone handling, so "morning" here means "morning in whatever
   timezone you picked when you set the schedule," not each contractor's
   own morning. Fine for a single-timezone pilot; revisit if contractors end
   up spread across timezones.
6. Resend's shared sandbox sender (`onboarding@resend.dev`, the default in
   `.env.local.example`) only delivers to the email address you signed up
   to Resend with. Verify your own domain in Resend and update `EMAIL_FROM`
   before sending real digests to more than one contractor.

You can trigger it manually to test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/daily-digest
```

It returns `{ sent, skipped, total, errors }` — `skipped` counts contractors
who'd already gotten today's digest (from a duplicate run), and `errors`
lists per-user failures (e.g. an email that failed to send) without failing
the whole batch.

## Data model

- **customers**: `name`, `contact`, `job`, `amount_owed`, `status`
  (`active` / `overdue` / `paid` / `closed`), `notes`. Scoped to the
  authenticated user via `user_id`.
- **follow_ups**: linked to a `customer_id`, with `reason`, `due_date`
  (required — `NOT NULL` at the DB level, enforced end to end; see
  `supabase/migrations/0002_follow_ups_due_date_required.sql`),
  `status` (`pending` / `done` / `skipped`), `notes`.

Both tables have row-level security policies so a signed-in user can only
read, insert, update, or delete their own rows.

## Pages

- `/login` — email/password sign in and sign up.
- `/dashboard` — money outstanding, follow-ups due today, overdue
  follow-ups, and a "needs attention" list linking straight to the
  relevant customers.
- `/customers` — searchable, filterable customer list with an "Add
  customer" dialog.
- `/customers/[id]` — customer detail, status editing, and follow-up
  management.
- `/follow-ups` — every follow-up across all customers, filterable by
  overdue / due today / pending / done / skipped.

Every pending follow-up (on the dashboard, a customer's page, and the
follow-ups list) has a **Message** action: it drafts a collections
message from one of three templates (friendly / firm / formal),
auto-selected by days overdue (1–5 / 6–13 / 14+), with merge fields
filled from the customer's real data. You can switch templates, edit
the text, then send via **Text** (opens the phone's SMS app, handling
the iOS/Android `sms:` URI difference), **Email** (opens the default
mail app), or **Copy** as a fallback. The app looks for a phone number
or email address in the customer's free-text `contact` field; if it
can't find either, Text/Email still open with no recipient pre-filled
rather than being disabled.

`GET /api/cron/daily-digest` (not a page — a cron-triggered API route) sends
each contractor with at least one pending follow-up due today or overdue a
short digest email: how many are due today, how many overdue, and the total
amount owed across those customers, with a link to their dashboard.
Contractors with nothing due get nothing that day. See "Daily digest email"
above for setup.

## Code layout

- `lib/data/*` — server-only data-access functions (one file per
  resource: `customers`, `follow-ups`, plus `dashboard` which combines
  both). Pages call these instead of touching Supabase directly.
- `lib/validation/*` — Zod schemas shared between client-side error
  display and server-side enforcement in the matching `actions.ts`.
- `lib/format.ts` — currency/date formatting and due-date helpers
  (`isOverdue`, `isDueToday`) shared by the dashboard, customer detail,
  and follow-ups pages.
- `components/ui/*` — presentational primitives (`Button`, `Field`
  wrappers, `Badge`, `Card`/`StatCard`, `Dialog`, `ConfirmDialog`,
  `EmptyState`, `Skeleton`, `Alert`, `RouteError`) used across all
  screens for a consistent look.
- `app/(app)/*` — the authenticated screens, sharing one layout (`nav`
  + page chrome). Each route has a `loading.tsx` skeleton and an
  `error.tsx` boundary alongside its `page.tsx`.
- Forms use React's `useActionState` + `useFormStatus`: server actions
  return a typed `FormState` (`lib/form-state.ts`) with field-level
  Zod errors, and `SubmitButton` shows a pending state automatically.
- Deletes go through `components/ui/confirm-dialog.tsx`, a reusable
  confirmation modal — no bare `window.confirm()`.
- `lib/message-templates.ts` holds the three message templates, tone
  selection by days overdue, and merge-field rendering.
  `lib/contact-links.ts` builds the `sms:`/`mailto:` links (including
  the iOS-vs-Android `sms:` query-separator difference) and does
  best-effort phone/email detection against the single `contact`
  field. `components/message-draft-dialog.tsx` is the dialog UI, used
  from the dashboard, customer detail, and follow-ups screens alike.
- The primary nav is a top bar with inline links on `sm:` and up, and
  a fixed bottom tab bar on mobile (thumb-reachable, no scrolled-off
  destinations) — this app is meant to be used mostly on a phone in
  the field. Tables scroll horizontally within their own card on
  narrow screens rather than overflowing the page.
- `lib/digest.ts` is the pure, unit-tested computation for the daily
  email (grouping follow-ups by contractor, counting due-today vs.
  overdue, summing each distinct customer's amount owed once).
  `lib/email/daily-digest-email.ts` builds the subject/text/html,
  using the same clause-dropping approach as the message templates
  ("3 overdue", never "0 overdue"). `utils/supabase/admin.ts` is a
  service-role client, used only by
  `app/api/cron/daily-digest/route.ts` since sending one email per
  contractor requires reading across all of them, which RLS
  otherwise (correctly) prevents. `middleware.ts` explicitly excludes
  `/api/*` from the session check — an API route authorizes itself
  (here, via `CRON_SECRET`), and a server-to-server cron request has
  no browser session to redirect from in the first place.

## Testing

```bash
npm test
```

Runs the Vitest suite:

- `lib/format.test.ts`, `lib/message-templates.test.ts` — the follow-up
  tier-selection logic: the exact boundary days (0, 1, 5, 6, 13, 14) that
  decide friendly vs. firm vs. formal, plus the missing-field
  message-template regressions. These pin the system clock rather than
  depending on whatever day the suite happens to run, and are built to be
  timezone-independent (they compute their own reference date via local
  `Date` getters rather than assuming a specific timezone) — see the
  comments in `lib/format.test.ts` for why that distinction matters here
  specifically.
- `lib/digest.test.ts` — the daily digest's grouping/counting logic,
  including that a customer with multiple due/overdue follow-ups only
  counts once toward the outstanding total, and that a user absent from
  the input (nothing due) never produces an entry.
- `lib/email/daily-digest-email.test.ts` — the digest email's subject/body
  clause-dropping (no "0 overdue"), singular/plural phrasing, and that the
  dashboard link and formatted amount actually make it into both the text
  and HTML versions.

## Data integrity

Required fields are enforced at every layer, not just the UI — a field that
must exist (customer `name`/`amount_owed`/`status`, follow-up
`reason`/`due_date`/`status`) is `NOT NULL` in the database, required in its
Zod schema (not just `.optional()` with a UI hint), and `required` on the
actual form input, so bad data is rejected before it's ever written rather
than tolerated and guessed around later. Fields that are genuinely optional
by nature (`contact`, `job`, `notes`) stay nullable throughout and are
`null`-checked wherever they're displayed or merged into text.
