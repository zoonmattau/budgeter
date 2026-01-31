-- Add invite code to households for sharing/joining
ALTER TABLE public.households
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Create index for faster lookup by invite code
CREATE INDEX IF NOT EXISTS idx_households_invite_code ON public.households(invite_code);

-- Generate invite codes for existing households that don't have one
UPDATE public.households
SET invite_code = upper(encode(gen_random_bytes(4), 'hex'))
WHERE invite_code IS NULL;
