-- Update the accounts type check constraint to include new type values
-- credit_card and loan are more descriptive than credit and debt

-- First, drop the existing constraint
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;

-- Add the new constraint with all valid types
ALTER TABLE public.accounts ADD CONSTRAINT accounts_type_check
  CHECK (type IN ('cash', 'bank', 'credit', 'credit_card', 'investment', 'debt', 'loan'));

-- Note: Existing 'credit' values are compatible with 'credit_card'
-- and 'debt' values are compatible with 'loan' for backwards compatibility
