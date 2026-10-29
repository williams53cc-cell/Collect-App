-- Reconstructed to match the live database (the original file was never
-- committed). The date a customer promised to pay by. Nullable: most
-- follow-ups never get one. Safe to re-run.
alter table follow_ups
  add column if not exists promised_date date;
