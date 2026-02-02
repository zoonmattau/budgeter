-- Create household_invitations table for email invitations
CREATE TABLE public.household_invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(household_id, invited_email)
);

-- Enable RLS
ALTER TABLE public.household_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Household owners can manage invitations
CREATE POLICY "Household owners can view invitations"
  ON public.household_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = household_invitations.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.role = 'owner'
    )
  );

CREATE POLICY "Household owners can create invitations"
  ON public.household_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = household_invitations.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.role = 'owner'
    )
    AND invited_by = auth.uid()
  );

CREATE POLICY "Household owners can delete invitations"
  ON public.household_invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = household_invitations.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.role = 'owner'
    )
  );

-- Policy: Users can view their own pending invitations (by email)
-- Note: This requires a function to check email since we don't have the email in the table
-- For now, we'll handle this via service role in the API

-- Index for faster lookups
CREATE INDEX idx_household_invitations_email_status
  ON public.household_invitations(invited_email, status);

CREATE INDEX idx_household_invitations_household
  ON public.household_invitations(household_id, status);
