-- Reconstructed to match the live database (the original file was never
-- committed). The payment timeline: one row per thing that happened on a
-- customer (added, amount changed, follow-up created, status changed,
-- promise set). Append-only on purpose: there are no update or delete
-- policies, so a recorded event cannot be edited or removed by a user
-- (it disappears only if the customer is deleted, via cascade).
-- Safe to re-run.
create table if not exists customer_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  customer_id uuid not null references customers (id) on delete cascade,
  headline text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_events_customer_id_idx
  on customer_events (customer_id, created_at desc);
create index if not exists customer_events_user_id_idx
  on customer_events (user_id);

alter table customer_events enable row level security;

drop policy if exists "Users can view their own customer events" on customer_events;
create policy "Users can view their own customer events"
  on customer_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own customer events" on customer_events;
create policy "Users can insert their own customer events"
  on customer_events for insert
  with check (auth.uid() = user_id);
