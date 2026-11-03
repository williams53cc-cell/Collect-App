-- Business contact details and quote terms, shown at the top and bottom of
-- the quote PDF. All optional: a contractor who has not filled them in yet
-- simply gets a quote without those lines. Nothing existing is changed.
-- Row-level security from 0009_business_profiles.sql already covers these
-- columns, since it works on the whole row.

alter table business_profiles
  add column if not exists business_phone text,
  add column if not exists business_email text,
  add column if not exists business_address text,
  add column if not exists quote_terms text;
