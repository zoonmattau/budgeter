-- Add optional notes field to transactions for user annotations
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes text;
