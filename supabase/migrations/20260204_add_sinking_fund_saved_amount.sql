-- Add saved_amount column to bills for sinking fund tracking
ALTER TABLE bills ADD COLUMN IF NOT EXISTS saved_amount NUMERIC(12,2) DEFAULT 0;

-- Reset all existing bills to 0 (in case column existed with NULL values)
UPDATE bills SET saved_amount = 0 WHERE saved_amount IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN bills.saved_amount IS 'Amount saved towards quarterly/yearly bills (sinking fund tracking)';
