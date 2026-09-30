-- Onboarding: captures the contractor's own name (nowhere else asks for
-- it today — signup only collects email/password) and tracks whether
-- they've completed the setup wizard, so the middleware knows who to
-- send to /onboarding and who to leave alone.

alter table business_profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists onboarding_completed boolean not null default false;

-- Accounts that already filled in Business info through Settings (from
-- before onboarding existed) already did the equivalent work, just
-- through a different door — backfill them as complete so they're never
-- forced through the wizard retroactively. A non-empty business_name is
-- the signal: it only gets set once someone has actually saved that
-- section (see 0009_business_profiles.sql for why it defaults to '').
update business_profiles
set onboarding_completed = true
where business_name <> '' and onboarding_completed = false;
