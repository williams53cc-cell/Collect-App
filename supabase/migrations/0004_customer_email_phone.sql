-- Reconstructed to match the live database (the original file was never
-- committed). Splits the single "contact" field into separate Email and
-- Phone fields on customers. Safe to run on a database that already has
-- them: every statement is "if not exists", so on the live database this
-- changes nothing.
--
-- The old "contact" column is intentionally left in place (it still exists
-- live); the app no longer writes to it. No data copy is done here because
-- the live data already settled when this was first applied by hand.
alter table customers
  add column if not exists email text,
  add column if not exists phone text;
