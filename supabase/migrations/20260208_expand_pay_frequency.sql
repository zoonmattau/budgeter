-- Expand pay_frequency to include quarterly and yearly options
ALTER TABLE public.income_entries
  DROP CONSTRAINT IF EXISTS income_entries_pay_frequency_check;

ALTER TABLE public.income_entries
  ADD CONSTRAINT income_entries_pay_frequency_check
  CHECK (pay_frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'));
