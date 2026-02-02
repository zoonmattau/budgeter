-- Add is_one_off column to bills table for one-time expenses
ALTER TABLE bills ADD COLUMN IF NOT EXISTS is_one_off BOOLEAN DEFAULT FALSE;
