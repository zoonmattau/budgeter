-- Add Basiq integration fields

-- Add basiq_user_id to profiles for linking Seedling users to Basiq
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS basiq_user_id text UNIQUE;

-- Add basiq_account_id to accounts for linking to Basiq accounts
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS basiq_account_id text UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_basiq_user_id ON public.profiles(basiq_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_basiq_account_id ON public.accounts(basiq_account_id);
