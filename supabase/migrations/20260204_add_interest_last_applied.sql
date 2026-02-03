-- Add interest_last_applied column to track when interest was last calculated
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS interest_last_applied DATE;

-- Add comment explaining the column
COMMENT ON COLUMN accounts.interest_last_applied IS 'Date when interest was last automatically applied to this loan/debt';
