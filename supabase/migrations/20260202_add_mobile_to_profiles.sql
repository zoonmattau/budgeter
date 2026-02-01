-- Add mobile phone number to profiles for bank connection
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mobile TEXT;
