-- Add pay schedule fields to income_entries for cash flow projections
ALTER TABLE public.income_entries
  ADD COLUMN IF NOT EXISTS pay_frequency text CHECK (pay_frequency IN ('weekly', 'fortnightly', 'monthly')),
  ADD COLUMN IF NOT EXISTS pay_day int, -- 1-31 for monthly, 0-6 (Sun-Sat) for weekly/fortnightly
  ADD COLUMN IF NOT EXISTS next_pay_date date;

-- Create index for faster lookups when calculating cash flow
CREATE INDEX IF NOT EXISTS idx_income_entries_next_pay_date ON public.income_entries(next_pay_date);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_recurring ON public.income_entries(user_id, is_recurring);
