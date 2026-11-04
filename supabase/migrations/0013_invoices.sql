-- Invoices: a bill a contractor sends to a customer, usually after a quote
-- is accepted, or on its own.
--
-- Rules built into the database (not just the app):
--  * A draft invoice has no number. The number (1, 2, 3...) is given when
--    the invoice is issued, so numbers never have gaps.
--  * An issued invoice is locked. The only change allowed is to void it
--    (cancel it). A mistake is fixed by voiding and making a new invoice.
--    A voided invoice keeps its number.
--  * Only a draft can be deleted.
--  * Totals are never stored: the invoice_totals view adds them up from
--    the lines, the same way quote_totals does.
-- Payments (and unpaid / part paid / paid) come in the next stage as their
-- own records. Additive only: nothing here changes quotes or customers.

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  customer_id uuid references customers (id) on delete set null,
  -- The quote this invoice was made from, if any.
  quote_id uuid references quotes (id) on delete set null,
  -- Null while a draft. Assigned by a trigger when the invoice is issued.
  invoice_number integer,
  title text not null,
  client_name text not null,
  client_phone text,
  client_email text,
  client_address text,
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'void')),
  currency text not null default 'JMD',
  discount_amount numeric(14, 2) not null default 0 check (discount_amount >= 0),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  customer_view text not null default 'detailed'
    check (customer_view in ('detailed', 'section_totals')),
  issued_on date,
  due_on date,
  notes text,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number),
  check (status = 'draft' or invoice_number is not null),
  check (status = 'draft' or issued_on is not null)
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  section text not null check (section in ('materials', 'labour', 'extras')),
  stage text,
  position integer not null default 0,
  description text not null,
  unit text,
  quantity numeric(14, 3) not null default 1 check (quantity >= 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  amount numeric(14, 2) generated always as (round(quantity * unit_price, 2)) stored,
  created_at timestamptz not null default now()
);

create index if not exists invoices_user_id_created_idx
  on invoices (user_id, created_at desc);
create index if not exists invoices_quote_id_idx on invoices (quote_id);
create index if not exists invoice_items_invoice_id_idx
  on invoice_items (invoice_id, section, position);
create index if not exists invoice_items_user_id_idx on invoice_items (user_id);

-- Gives the invoice its number and issue date at the moment it is issued.
-- The advisory lock makes two invoices issued at the same moment get
-- different numbers.
create or replace function assign_invoice_number() returns trigger
language plpgsql as $$
begin
  if old.status = 'draft' and new.status = 'issued' then
    perform pg_advisory_xact_lock(hashtext('invoice:' || new.user_id::text));
    new.invoice_number := coalesce(
      (select max(invoice_number) from invoices where user_id = new.user_id), 0
    ) + 1;
    new.issued_on := coalesce(new.issued_on, current_date);
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_assign_number on invoices;
create trigger invoices_assign_number
  before update on invoices
  for each row execute function assign_invoice_number();

-- Locks issued and voided invoices.
create or replace function guard_invoice_update() returns trigger
language plpgsql as $$
begin
  if old.status = 'draft' then
    if new.status = 'void' then
      raise exception 'A draft invoice cannot be voided. Delete it instead.';
    end if;
    return new;
  end if;
  if old.status = 'void' then
    raise exception 'A voided invoice cannot be changed.';
  end if;
  -- old.status = 'issued'
  if new.status = 'void' then
    if (to_jsonb(new) - 'status' - 'voided_at' - 'void_reason' - 'updated_at')
       is distinct from
       (to_jsonb(old) - 'status' - 'voided_at' - 'void_reason' - 'updated_at') then
      raise exception 'Only the status can change when an invoice is voided.';
    end if;
    new.voided_at := coalesce(new.voided_at, now());
    return new;
  end if;
  raise exception 'An issued invoice cannot be changed. Void it and make a new invoice.';
end;
$$;

drop trigger if exists invoices_guard_update on invoices;
create trigger invoices_guard_update
  before update on invoices
  for each row execute function guard_invoice_update();

-- Lines can only be added, changed or removed while the invoice is a draft.
create or replace function guard_invoice_items() returns trigger
language plpgsql as $$
declare
  target uuid;
begin
  target := case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end;
  if exists (select 1 from invoices where id = target and status <> 'draft') then
    raise exception 'The lines of an issued invoice cannot be changed.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists invoice_items_guard on invoice_items;
create trigger invoice_items_guard
  before insert or update or delete on invoice_items
  for each row execute function guard_invoice_items();

create or replace function set_invoices_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists invoices_set_updated_at on invoices;
create trigger invoices_set_updated_at
  before update on invoices
  for each row execute function set_invoices_updated_at();

alter table invoices enable row level security;
alter table invoice_items enable row level security;

drop policy if exists "Users can view their own invoices" on invoices;
create policy "Users can view their own invoices"
  on invoices for select
  using (auth.uid() = user_id);

-- New invoices always start as drafts, and can only be linked to the
-- contractor's own customer and quote.
drop policy if exists "Users can insert their own invoices" on invoices;
create policy "Users can insert their own invoices"
  on invoices for insert
  with check (
    auth.uid() = user_id
    and status = 'draft'
    and (
      customer_id is null
      or exists (
        select 1 from customers c
        where c.id = customer_id and c.user_id = auth.uid()
      )
    )
    and (
      quote_id is null
      or exists (
        select 1 from quotes q
        where q.id = quote_id and q.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can update their own invoices" on invoices;
create policy "Users can update their own invoices"
  on invoices for update
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
    and (
      quote_id is null
      or exists (
        select 1 from quotes q
        where q.id = quote_id and q.user_id = auth.uid()
      )
    )
  );

-- Only drafts can be deleted.
drop policy if exists "Users can delete their own draft invoices" on invoices;
create policy "Users can delete their own draft invoices"
  on invoices for delete
  using (auth.uid() = user_id and status = 'draft');

drop policy if exists "Users can view their own invoice items" on invoice_items;
create policy "Users can view their own invoice items"
  on invoice_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own invoice items" on invoice_items;
create policy "Users can insert their own invoice items"
  on invoice_items for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from invoices i
      where i.id = invoice_id and i.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own invoice items" on invoice_items;
create policy "Users can update their own invoice items"
  on invoice_items for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from invoices i
      where i.id = invoice_id and i.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own invoice items" on invoice_items;
create policy "Users can delete their own invoice items"
  on invoice_items for delete
  using (auth.uid() = user_id);

-- Totals for every invoice, always computed from its lines (same rules as
-- quote_totals).
create or replace view invoice_totals with (security_invoker = true) as
select
  inv.id as invoice_id,
  coalesce(sum(i.amount) filter (where i.section = 'materials'), 0)::numeric(14, 2) as materials_total,
  coalesce(sum(i.amount) filter (where i.section = 'labour'), 0)::numeric(14, 2) as labour_total,
  coalesce(sum(i.amount) filter (where i.section = 'extras'), 0)::numeric(14, 2) as extras_total,
  coalesce(sum(i.amount), 0)::numeric(14, 2) as subtotal,
  inv.discount_amount,
  round(
    greatest(coalesce(sum(i.amount), 0) - inv.discount_amount, 0) * inv.tax_rate / 100, 2
  )::numeric(14, 2) as tax_amount,
  (
    greatest(coalesce(sum(i.amount), 0) - inv.discount_amount, 0)
    + round(
        greatest(coalesce(sum(i.amount), 0) - inv.discount_amount, 0) * inv.tax_rate / 100, 2
      )
  )::numeric(14, 2) as total
from invoices inv
left join invoice_items i on i.invoice_id = inv.id
group by inv.id;

-- Makes a draft invoice from an accepted quote, copying the customer
-- details and every line, in one step (all or nothing). It runs as the
-- signed-in user, so row-level security still applies.
create or replace function create_invoice_from_quote(p_quote_id uuid)
returns uuid
language plpgsql
security invoker
as $$
declare
  q quotes%rowtype;
  new_id uuid;
begin
  select * into q from quotes where id = p_quote_id;
  if not found then
    raise exception 'Quote not found.';
  end if;
  if q.status <> 'accepted' then
    raise exception 'Only an accepted quote can be turned into an invoice.';
  end if;

  insert into invoices (
    customer_id, quote_id, title, client_name, client_phone, client_email,
    client_address, currency, discount_amount, tax_rate, customer_view, notes
  ) values (
    q.customer_id, q.id, q.title, q.client_name, q.client_phone, q.client_email,
    q.client_address, q.currency, q.discount_amount, q.tax_rate, q.customer_view, q.notes
  ) returning id into new_id;

  insert into invoice_items (
    invoice_id, section, stage, position, description, unit, quantity, unit_price
  )
  select new_id, section, stage, position, description, unit, quantity, unit_price
  from quote_items
  where quote_id = p_quote_id;

  return new_id;
end;
$$;

revoke all on function create_invoice_from_quote(uuid) from public, anon;
grant execute on function create_invoice_from_quote(uuid) to authenticated;
