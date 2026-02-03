-- Seedling Budget App - Initial Schema
-- ===================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ===================================
-- PROFILES (extends auth.users)
-- ===================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  currency text not null default 'AUD',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');

  -- Create default categories for new user
  insert into public.categories (user_id, name, icon, color, type, is_system, sort_order) values
    (new.id, 'Salary', 'banknote', '#22c55e', 'income', true, 0),
    (new.id, 'Other Income', 'plus-circle', '#16a34a', 'income', true, 1),
    (new.id, 'Groceries', 'shopping-cart', '#f97316', 'expense', true, 0),
    (new.id, 'Dining Out', 'utensils', '#ef4444', 'expense', true, 1),
    (new.id, 'Transport', 'car', '#3b82f6', 'expense', true, 2),
    (new.id, 'Utilities', 'zap', '#eab308', 'expense', true, 3),
    (new.id, 'Rent/Mortgage', 'home', '#8b5cf6', 'expense', true, 4),
    (new.id, 'Entertainment', 'tv', '#ec4899', 'expense', true, 5),
    (new.id, 'Shopping', 'shopping-bag', '#d946ef', 'expense', true, 6),
    (new.id, 'Health', 'heart-pulse', '#14b8a6', 'expense', true, 7),
    (new.id, 'Subscriptions', 'repeat', '#6366f1', 'expense', true, 8),
    (new.id, 'Savings', 'piggy-bank', '#22c55e', 'expense', true, 9),
    (new.id, 'Other', 'circle-dot', '#64748b', 'expense', true, 10);

  -- Create user stats
  insert into public.user_stats (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===================================
-- HOUSEHOLDS (for shared budgeting)
-- ===================================
create table public.households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;

create table public.household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique(household_id, user_id)
);

alter table public.household_members enable row level security;

-- Household policies
create policy "Users can view households they belong to"
  on public.households for select
  using (
    id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "Users can create households"
  on public.households for insert
  with check (created_by = auth.uid());

create policy "Owners can update households"
  on public.households for update
  using (created_by = auth.uid());

create policy "Owners can delete households"
  on public.households for delete
  using (created_by = auth.uid());

-- Household members policies
create policy "Users can view household members"
  on public.household_members for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "Owners can manage household members"
  on public.household_members for all
  using (
    household_id in (
      select id from public.households where created_by = auth.uid()
    )
  );

-- Auto-add creator as owner when household is created
create or replace function public.handle_new_household()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.household_members (household_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_household_created
  after insert on public.households
  for each row execute procedure public.handle_new_household();

-- ===================================
-- ACCOUNTS (bank, cash, credit, etc.)
-- ===================================
create table public.accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'credit', 'investment', 'debt')),
  balance numeric(12,2) not null default 0,
  is_asset boolean not null default true,
  institution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy "Users can manage own accounts"
  on public.accounts for all
  using (
    user_id = auth.uid()
    or household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- ===================================
-- CATEGORIES
-- ===================================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  type text not null default 'expense' check (type in ('expense', 'income', 'transfer')),
  is_system boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Users can manage own categories"
  on public.categories for all
  using (
    user_id = auth.uid()
    or household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- ===================================
-- BUDGETS (monthly allocations)
-- ===================================
create table public.budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month date not null, -- First of month (e.g., 2026-01-01)
  allocated numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, household_id, category_id, month)
);

alter table public.budgets enable row level security;

create policy "Users can manage own budgets"
  on public.budgets for all
  using (
    user_id = auth.uid()
    or household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- ===================================
-- INCOME ENTRIES
-- ===================================
create table public.income_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  month date not null,
  source text not null,
  amount numeric(12,2) not null,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.income_entries enable row level security;

create policy "Users can manage own income entries"
  on public.income_entries for all
  using (
    user_id = auth.uid()
    or household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- ===================================
-- TRANSACTIONS
-- ===================================
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric(12,2) not null,
  type text not null default 'expense' check (type in ('expense', 'income', 'transfer')),
  description text not null,
  date date not null,
  is_recurring boolean not null default false,
  bill_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Users can manage own transactions"
  on public.transactions for all
  using (
    user_id = auth.uid()
    or household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- Index for common queries
create index transactions_user_date_idx on public.transactions(user_id, date desc);
create index transactions_category_idx on public.transactions(category_id);

-- ===================================
-- BILLS (recurring)
-- ===================================
create table public.bills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  amount numeric(12,2) not null,
  frequency text not null default 'monthly' check (frequency in ('weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly')),
  due_day int not null check (due_day >= 1 and due_day <= 31),
  next_due date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.bills enable row level security;

create policy "Users can manage own bills"
  on public.bills for all
  using (
    user_id = auth.uid()
    or household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- Add foreign key to transactions after bills table exists
alter table public.transactions
  add constraint transactions_bill_id_fkey
  foreign key (bill_id) references public.bills(id) on delete set null;

-- ===================================
-- GOALS
-- ===================================
create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  name text not null,
  icon text not null default 'target',
  color text not null default '#d946ef',
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  deadline date,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  visual_type text not null default 'plant' check (visual_type in ('plant', 'jar', 'blocks')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "Users can manage own goals"
  on public.goals for all
  using (
    user_id = auth.uid()
    or household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- ===================================
-- GOAL CONTRIBUTIONS
-- ===================================
create table public.goal_contributions (
  id uuid primary key default uuid_generate_v4(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  amount numeric(12,2) not null,
  source text not null default 'manual' check (source in ('manual', 'budget', 'challenge')),
  note text,
  date date not null,
  created_at timestamptz not null default now()
);

alter table public.goal_contributions enable row level security;

create policy "Users can manage goal contributions"
  on public.goal_contributions for all
  using (
    goal_id in (
      select id from public.goals where user_id = auth.uid()
      union
      select g.id from public.goals g
      join public.household_members hm on g.household_id = hm.household_id
      where hm.user_id = auth.uid()
    )
  );

-- Update goal current_amount when contribution is added
create or replace function public.update_goal_amount()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    update public.goals set
      current_amount = current_amount + new.amount,
      updated_at = now()
    where id = new.goal_id;
  elsif TG_OP = 'DELETE' then
    update public.goals set
      current_amount = current_amount - old.amount,
      updated_at = now()
    where id = old.goal_id;
  elsif TG_OP = 'UPDATE' then
    update public.goals set
      current_amount = current_amount - old.amount + new.amount,
      updated_at = now()
    where id = new.goal_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger on_goal_contribution_change
  after insert or update or delete on public.goal_contributions
  for each row execute procedure public.update_goal_amount();

-- ===================================
-- CHALLENGES
-- ===================================
create table public.challenges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  description text not null,
  type text not null check (type in ('save_amount', 'reduce_category', 'no_spend_day', 'streak')),
  target_value numeric(12,2) not null,
  current_value numeric(12,2) not null default 0,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'failed')),
  reward_xp int not null default 50,
  created_at timestamptz not null default now()
);

alter table public.challenges enable row level security;

create policy "Users can manage own challenges"
  on public.challenges for all
  using (user_id = auth.uid());

-- ===================================
-- ACHIEVEMENTS
-- ===================================
create table public.achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  earned_at timestamptz not null default now(),
  metadata jsonb,
  unique(user_id, type)
);

alter table public.achievements enable row level security;

create policy "Users can view own achievements"
  on public.achievements for select
  using (user_id = auth.uid());

create policy "System can insert achievements"
  on public.achievements for insert
  with check (user_id = auth.uid());

-- ===================================
-- USER STATS (gamification)
-- ===================================
create table public.user_stats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  total_xp int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  goals_completed int not null default 0,
  challenges_won int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

create policy "Users can view own stats"
  on public.user_stats for select
  using (user_id = auth.uid());

create policy "Users can update own stats"
  on public.user_stats for update
  using (user_id = auth.uid());

-- ===================================
-- HELPER FUNCTIONS
-- ===================================

-- Get current month start date
create or replace function public.current_month_start()
returns date
language sql
stable
as $$
  select date_trunc('month', current_date)::date;
$$;

-- Get total spent for a category in a month
create or replace function public.get_category_spent(
  p_user_id uuid,
  p_category_id uuid,
  p_month date
)
returns numeric
language sql
stable
security definer
as $$
  select coalesce(sum(amount), 0)
  from public.transactions
  where user_id = p_user_id
    and category_id = p_category_id
    and date >= p_month
    and date < (p_month + interval '1 month')::date
    and type = 'expense';
$$;

-- Get total income for a user in a month
create or replace function public.get_monthly_income(
  p_user_id uuid,
  p_month date
)
returns numeric
language sql
stable
security definer
as $$
  select coalesce(sum(amount), 0)
  from public.income_entries
  where user_id = p_user_id
    and month = p_month;
$$;

-- Get total allocated budget for a user in a month
create or replace function public.get_monthly_allocated(
  p_user_id uuid,
  p_month date
)
returns numeric
language sql
stable
security definer
as $$
  select coalesce(sum(allocated), 0)
  from public.budgets
  where user_id = p_user_id
    and month = p_month;
$$;
