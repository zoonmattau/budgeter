-- Allow household members to view each other's profiles (for display names)
-- The existing policy only allows users to view their own profile,
-- which causes household member names to show as "Member" instead of real names.

CREATE POLICY "Household members can view each others profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR id IN (
      SELECT hm2.user_id
      FROM public.household_members hm1
      JOIN public.household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.user_id = auth.uid()
    )
  );

-- Allow household members to read each other's categories
-- This is needed so household budget allocations (which reference one member's category IDs)
-- can be joined with category names and remapped to the other member's categories.

CREATE POLICY "Household members can view each others categories"
  ON public.categories FOR SELECT
  USING (
    user_id IN (
      SELECT hm2.user_id
      FROM public.household_members hm1
      JOIN public.household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.user_id = auth.uid()
    )
  );
