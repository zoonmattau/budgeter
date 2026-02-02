-- payment_patterns: Stores learned recurring payment patterns
create table public.payment_patterns (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  typical_amount numeric(12,2) not null,
  amount_variance numeric(12,2) default 0,
  frequency text not null check (frequency in ('weekly','fortnightly','monthly','quarterly','yearly')),
  typical_day int not null check (typical_day >= 1 and typical_day <= 31),
  day_variance int default 3,
  confidence numeric(3,2) default 0.50,
  occurrence_count int default 1,
  category_id uuid references public.categories(id),
  is_active boolean default true,
  last_occurrence date,
  next_expected date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, normalized_name)
);

-- pattern_predictions: Individual predictions for tracking
create table public.pattern_predictions (
  id uuid primary key default uuid_generate_v4(),
  pattern_id uuid not null references public.payment_patterns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  predicted_date date not null,
  predicted_amount numeric(12,2) not null,
  status text default 'pending' check (status in ('pending','matched','dismissed','expired')),
  matched_transaction_id uuid references public.transactions(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- Add indexes for common queries
create index payment_patterns_user_id_idx on public.payment_patterns(user_id);
create index payment_patterns_next_expected_idx on public.payment_patterns(next_expected);
create index pattern_predictions_user_id_status_idx on public.pattern_predictions(user_id, status);
create index pattern_predictions_pattern_id_idx on public.pattern_predictions(pattern_id);

-- Enable RLS
alter table public.payment_patterns enable row level security;
alter table public.pattern_predictions enable row level security;

-- RLS policies for payment_patterns
create policy "Users can view own payment patterns"
  on public.payment_patterns for select
  using (auth.uid() = user_id);

create policy "Users can insert own payment patterns"
  on public.payment_patterns for insert
  with check (auth.uid() = user_id);

create policy "Users can update own payment patterns"
  on public.payment_patterns for update
  using (auth.uid() = user_id);

create policy "Users can delete own payment patterns"
  on public.payment_patterns for delete
  using (auth.uid() = user_id);

-- RLS policies for pattern_predictions
create policy "Users can view own predictions"
  on public.pattern_predictions for select
  using (auth.uid() = user_id);

create policy "Users can insert own predictions"
  on public.pattern_predictions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own predictions"
  on public.pattern_predictions for update
  using (auth.uid() = user_id);

create policy "Users can delete own predictions"
  on public.pattern_predictions for delete
  using (auth.uid() = user_id);
