-- Business Profile: one row per contractor account, capturing the info
-- needed to personalize message drafts (business name) and drive the
-- signup onboarding flow (business type, currency, region, timezone, and
-- how the contractor gets paid).
--
-- Keyed directly by user_id, like digest_sends below — GripBill is one
-- contractor per account for now (no shared/team accounts), so a separate
-- `businesses` table with its own id and a business_id foreign key on
-- every other table would be pure indirection with nothing on the other
-- end of it yet. Every existing table already has user_id + row-level
-- security scoping every contractor to their own data (see
-- 0001_init.sql) — this table plugs into that same scoping rather than
-- introducing a second one. If GripBill ever supports multiple people per
-- business, that's the point to introduce a real business_id — not before.

create table if not exists business_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  -- Not null, but defaults to '' rather than requiring a value up front:
  -- Settings' two sections (business info, getting paid) can each be
  -- saved independently and in either order, so whichever one a
  -- contractor fills in first has to be able to create this row on its
  -- own. The business info form itself still requires a real name before
  -- it lets you save (lib/validation/business-profile.ts) — this default
  -- only covers the moment before either section has been saved yet.
  business_name text not null default '',
  business_type text not null default 'other',
  currency text not null default 'USD',
  country text,
  timezone text,
  payment_method text,
  payment_link text,
  payment_instructions text,
  include_payment_link_default boolean not null default true,
  created_at timestamptz not null default now()
);

alter table business_profiles enable row level security;

drop policy if exists "Users can view their own business profile" on business_profiles;
create policy "Users can view their own business profile"
  on business_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own business profile" on business_profiles;
create policy "Users can insert their own business profile"
  on business_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own business profile" on business_profiles;
create policy "Users can update their own business profile"
  on business_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
