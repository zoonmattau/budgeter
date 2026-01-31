-- Fix infinite recursion in household_members RLS policies
-- ========================================================

-- Create a security definer function to check household membership
-- This avoids RLS recursion by bypassing policies
create or replace function public.user_household_ids(p_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.household_members where user_id = p_user_id;
$$;

-- Drop the problematic policies
drop policy if exists "Users can view household members" on public.household_members;
drop policy if exists "Owners can manage household members" on public.household_members;

-- Recreate with non-recursive policies
create policy "Users can view household members"
  on public.household_members for select
  using (user_id = auth.uid() or household_id in (select public.user_household_ids(auth.uid())));

create policy "Users can insert household members"
  on public.household_members for insert
  with check (
    -- Can add yourself to a household (for joining)
    user_id = auth.uid()
    -- Or you're the household owner
    or household_id in (select id from public.households where created_by = auth.uid())
  );

create policy "Owners can update household members"
  on public.household_members for update
  using (household_id in (select id from public.households where created_by = auth.uid()));

create policy "Owners can delete household members"
  on public.household_members for delete
  using (
    -- Owner can remove anyone
    household_id in (select id from public.households where created_by = auth.uid())
    -- Or user can remove themselves
    or user_id = auth.uid()
  );

-- Now fix all other policies that reference household_members
-- Categories
drop policy if exists "Users can manage own categories" on public.categories;
create policy "Users can manage own categories"
  on public.categories for all
  using (
    user_id = auth.uid()
    or household_id in (select public.user_household_ids(auth.uid()))
  );

-- Accounts
drop policy if exists "Users can manage own accounts" on public.accounts;
create policy "Users can manage own accounts"
  on public.accounts for all
  using (
    user_id = auth.uid()
    or household_id in (select public.user_household_ids(auth.uid()))
  );

-- Budgets
drop policy if exists "Users can manage own budgets" on public.budgets;
create policy "Users can manage own budgets"
  on public.budgets for all
  using (
    user_id = auth.uid()
    or household_id in (select public.user_household_ids(auth.uid()))
  );

-- Income entries
drop policy if exists "Users can manage own income entries" on public.income_entries;
create policy "Users can manage own income entries"
  on public.income_entries for all
  using (
    user_id = auth.uid()
    or household_id in (select public.user_household_ids(auth.uid()))
  );

-- Transactions
drop policy if exists "Users can manage own transactions" on public.transactions;
create policy "Users can manage own transactions"
  on public.transactions for all
  using (
    user_id = auth.uid()
    or household_id in (select public.user_household_ids(auth.uid()))
  );

-- Bills
drop policy if exists "Users can manage own bills" on public.bills;
create policy "Users can manage own bills"
  on public.bills for all
  using (
    user_id = auth.uid()
    or household_id in (select public.user_household_ids(auth.uid()))
  );

-- Goals
drop policy if exists "Users can manage own goals" on public.goals;
create policy "Users can manage own goals"
  on public.goals for all
  using (
    user_id = auth.uid()
    or household_id in (select public.user_household_ids(auth.uid()))
  );

-- Households view policy also needs fixing
drop policy if exists "Users can view households they belong to" on public.households;
create policy "Users can view households they belong to"
  on public.households for select
  using (id in (select public.user_household_ids(auth.uid())));
