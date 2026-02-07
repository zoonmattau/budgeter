-- Budget settings: per-user, per-month budget metadata
-- Stores values like extra debt payments that don't belong to a specific category
create table public.budget_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  month date not null,
  extra_debt_payment numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, household_id, month)
);

alter table public.budget_settings enable row level security;

create policy "Users can manage own budget settings"
  on public.budget_settings for all
  using (
    user_id = auth.uid()
    or household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    or household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );
