-- Add to_account_id column for tracking destination account on transfer transactions
ALTER TABLE transactions ADD COLUMN to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
