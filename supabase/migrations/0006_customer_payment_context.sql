-- Reconstructed to match the live database (the original file was never
-- committed). Adds payment_type, payment_trigger and payment_trigger_note
-- to customers: what kind of payment a balance is, and what has to happen
-- before it is due. All three are nullable so older customers keep working.
-- Safe to re-run: columns use "if not exists" and each check constraint is
-- skipped if it is already there.
alter table customers
  add column if not exists payment_type text,
  add column if not exists payment_trigger text,
  add column if not exists payment_trigger_note text;

do $$ begin
  alter table customers
    add constraint customers_payment_type_check
    check (
      payment_type is null
      or payment_type = any (array[
        'deposit', 'materials_payment', 'stage_payment', 'final_balance', 'other'
      ])
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table customers
    add constraint customers_payment_trigger_check
    check (
      payment_trigger is null
      or payment_trigger = any (array[
        'before_work_begins', 'before_materials_ordered',
        'after_stage_completed', 'at_job_completion',
        'on_specific_date', 'custom'
      ])
    );
exception when duplicate_object then null;
end $$;
