-- Quotes: a priced offer a contractor sends to a customer before the job.
-- Each quote has line items in three sections (materials, labour, extras).
-- Totals are never typed in or stored: the quote_totals view below adds
-- them up from the line items, so a total can never disagree with its
-- lines. Additive only: nothing here touches customers or follow_ups.
--
-- The customer's name, phone, email and address are copied onto the quote
-- (a quote is a document and must keep reading the same even if the
-- customer record changes later). customer_id is an optional link.

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  customer_id uuid references customers (id) on delete set null,
  -- Per-contractor running number (1, 2, 3...), assigned by a trigger below.
  quote_number integer not null default 0,
  title text not null,
  client_name text not null,
  client_phone text,
  client_email text,
  client_address text,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined')),
  currency text not null default 'JMD',
  -- A flat amount taken off the subtotal before tax.
  discount_amount numeric(14, 2) not null default 0 check (discount_amount >= 0),
  -- A percentage, e.g. 15 for 15%. Zero means no tax line.
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  -- What the customer sees on the sent quote: every line, or one total per section.
  customer_view text not null default 'detailed'
    check (customer_view in ('detailed', 'section_totals')),
  valid_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, quote_number)
);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  quote_id uuid not null references quotes (id) on delete cascade,
  section text not null check (section in ('materials', 'labour', 'extras')),
  -- Optional build stage label, e.g. "Foundation", "Lintel".
  stage text,
  position integer not null default 0,
  description text not null,
  -- Free text on purpose: tonne, dozen, cu yd, each, RN/FT, sq...
  unit text,
  quantity numeric(14, 3) not null default 1 check (quantity >= 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  amount numeric(14, 2) generated always as (round(quantity * unit_price, 2)) stored,
  created_at timestamptz not null default now()
);

create index if not exists quotes_user_id_created_idx
  on quotes (user_id, created_at desc);
create index if not exists quote_items_quote_id_idx
  on quote_items (quote_id, section, position);
create index if not exists quote_items_user_id_idx
  on quote_items (user_id);

-- Next quote number for this contractor. The advisory lock makes two quotes
-- saved at the same moment get different numbers.
create or replace function assign_quote_number() returns trigger
language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  new.quote_number := coalesce(
    (select max(quote_number) from quotes where user_id = new.user_id), 0
  ) + 1;
  return new;
end;
$$;

drop trigger if exists quotes_assign_number on quotes;
create trigger quotes_assign_number
  before insert on quotes
  for each row execute function assign_quote_number();

create or replace function set_quotes_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists quotes_set_updated_at on quotes;
create trigger quotes_set_updated_at
  before update on quotes
  for each row execute function set_quotes_updated_at();

alter table quotes enable row level security;
alter table quote_items enable row level security;

drop policy if exists "Users can view their own quotes" on quotes;
create policy "Users can view their own quotes"
  on quotes for select
  using (auth.uid() = user_id);

-- A quote can only be linked to one of the contractor's own customers.
drop policy if exists "Users can insert their own quotes" on quotes;
create policy "Users can insert their own quotes"
  on quotes for insert
  with check (
    auth.uid() = user_id
    and (
      customer_id is null
      or exists (
        select 1 from customers c
        where c.id = customer_id and c.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can update their own quotes" on quotes;
create policy "Users can update their own quotes"
  on quotes for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      customer_id is null
      or exists (
        select 1 from customers c
        where c.id = customer_id and c.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can delete their own quotes" on quotes;
create policy "Users can delete their own quotes"
  on quotes for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own quote items" on quote_items;
create policy "Users can view their own quote items"
  on quote_items for select
  using (auth.uid() = user_id);

-- A line item can only be added to one of the contractor's own quotes.
drop policy if exists "Users can insert their own quote items" on quote_items;
create policy "Users can insert their own quote items"
  on quote_items for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from quotes q
      where q.id = quote_id and q.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own quote items" on quote_items;
create policy "Users can update their own quote items"
  on quote_items for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from quotes q
      where q.id = quote_id and q.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own quote items" on quote_items;
create policy "Users can delete their own quote items"
  on quote_items for delete
  using (auth.uid() = user_id);

-- Totals for every quote, always computed from its line items:
--   subtotal   = sum of line amounts
--   tax_amount = (subtotal - discount, never below 0) x tax_rate%, rounded to cents
--   total      = (subtotal - discount, never below 0) + tax_amount
-- security_invoker makes the view respect the same row-level security as
-- the tables, so a contractor only ever sees their own totals.
create or replace view quote_totals with (security_invoker = true) as
select
  q.id as quote_id,
  coalesce(sum(i.amount) filter (where i.section = 'materials'), 0)::numeric(14, 2) as materials_total,
  coalesce(sum(i.amount) filter (where i.section = 'labour'), 0)::numeric(14, 2) as labour_total,
  coalesce(sum(i.amount) filter (where i.section = 'extras'), 0)::numeric(14, 2) as extras_total,
  coalesce(sum(i.amount), 0)::numeric(14, 2) as subtotal,
  q.discount_amount,
  round(
    greatest(coalesce(sum(i.amount), 0) - q.discount_amount, 0) * q.tax_rate / 100, 2
  )::numeric(14, 2) as tax_amount,
  (
    greatest(coalesce(sum(i.amount), 0) - q.discount_amount, 0)
    + round(
        greatest(coalesce(sum(i.amount), 0) - q.discount_amount, 0) * q.tax_rate / 100, 2
      )
  )::numeric(14, 2) as total
from quotes q
left join quote_items i on i.quote_id = q.id
group by q.id;
