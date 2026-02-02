-- Ensure insert policy exists for households
drop policy if exists "Users can create households" on public.households;
create policy "Users can create households"
  on public.households for insert
  with check (created_by = auth.uid());

-- Also ensure update and delete policies exist
drop policy if exists "Owners can update households" on public.households;
create policy "Owners can update households"
  on public.households for update
  using (created_by = auth.uid());

drop policy if exists "Owners can delete households" on public.households;
create policy "Owners can delete households"
  on public.households for delete
  using (created_by = auth.uid());
