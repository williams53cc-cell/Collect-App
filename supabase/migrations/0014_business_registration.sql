-- Tax registration numbers printed on quotes and invoices: the contractor's
-- Taxpayer Registration Number (TRN) and, if they are registered for GCT,
-- their GCT registration number. Both are optional: a contractor who
-- leaves them empty simply gets a document without those lines.
-- Row-level security from 0009_business_profiles.sql already covers these
-- columns, since it works on the whole row. Nothing existing is changed.

alter table business_profiles
  add column if not exists trn text,
  add column if not exists gct_number text;
