-- Allow any authenticated user to look up a household by invite code
-- This is needed so users can join a household they're not yet a member of
CREATE POLICY "Users can lookup households by invite code"
  ON public.households FOR SELECT
  USING (
    invite_code IS NOT NULL
    AND auth.uid() IS NOT NULL
  );
