-- Add user_id to goal_contributions to track who made each contribution
alter table public.goal_contributions
add column if not exists user_id uuid references public.profiles(id);

-- Update existing contributions to use the goal owner's user_id
update public.goal_contributions gc
set user_id = g.user_id
from public.goals g
where gc.goal_id = g.id and gc.user_id is null;

-- Make user_id required for new contributions
alter table public.goal_contributions
alter column user_id set not null;

-- Add index for querying contributions by user
create index if not exists goal_contributions_user_id_idx
on public.goal_contributions(user_id);

-- Update RLS policy to allow household members to contribute to shared goals
drop policy if exists "Users can manage goal contributions" on public.goal_contributions;

create policy "Users can manage own contributions"
  on public.goal_contributions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can view contributions on their goals"
  on public.goal_contributions for select
  using (
    goal_id in (
      select id from public.goals where user_id = auth.uid()
    )
  );

create policy "Users can view contributions on household goals"
  on public.goal_contributions for select
  using (
    goal_id in (
      select g.id from public.goals g
      where g.household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
    )
  );

create policy "Household members can contribute to household goals"
  on public.goal_contributions for insert
  with check (
    goal_id in (
      select g.id from public.goals g
      where g.household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
    )
  );
