-- Track when a bill was last marked as paid
ALTER TABLE bills ADD COLUMN IF NOT EXISTS last_paid_date date;
