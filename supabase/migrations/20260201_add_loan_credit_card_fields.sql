-- Add loan and credit card specific fields to accounts table
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS interest_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS interest_free_days int,
  ADD COLUMN IF NOT EXISTS due_date int, -- day of month (1-31)
  ADD COLUMN IF NOT EXISTS minimum_payment numeric(12,2),
  ADD COLUMN IF NOT EXISTS original_amount numeric(12,2), -- for loans: original borrowed amount
  ADD COLUMN IF NOT EXISTS payoff_date date,
  ADD COLUMN IF NOT EXISTS payment_frequency text CHECK (payment_frequency IN ('weekly', 'fortnightly', 'monthly'));

-- Add account_id to transactions to link expenses to credit cards
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);

-- Add Interest category to handle_new_user function
-- First, let's add it directly for existing users
INSERT INTO public.categories (user_id, name, icon, color, type, is_system, sort_order)
SELECT id, 'Interest', 'percent', '#dc2626', 'expense', true, 11
FROM public.profiles
WHERE id NOT IN (
  SELECT user_id FROM public.categories WHERE name = 'Interest' AND type = 'expense'
);

-- Update the handle_new_user function to include Interest category
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');

  -- Create default categories for new user
  INSERT INTO public.categories (user_id, name, icon, color, type, is_system, sort_order) VALUES
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
    (new.id, 'Interest', 'percent', '#dc2626', 'expense', true, 10),
    (new.id, 'Other', 'circle-dot', '#64748b', 'expense', true, 11);

  -- Create user stats
  INSERT INTO public.user_stats (user_id) VALUES (new.id);

  RETURN new;
END;
$$;

-- Function to calculate current balance for credit cards/loans with interest
CREATE OR REPLACE FUNCTION public.calculate_account_balance(p_account_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_account public.accounts%ROWTYPE;
  v_transactions_total numeric;
  v_current_balance numeric;
BEGIN
  SELECT * INTO v_account FROM public.accounts WHERE id = p_account_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Get sum of transactions linked to this account
  SELECT COALESCE(SUM(
    CASE WHEN type = 'expense' THEN amount ELSE -amount END
  ), 0) INTO v_transactions_total
  FROM public.transactions
  WHERE account_id = p_account_id;

  -- For credit cards: balance = transactions total (expenses add, payments subtract)
  -- For loans: balance = original amount - payments made
  IF v_account.type IN ('credit', 'credit_card') THEN
    v_current_balance := v_account.balance + v_transactions_total;
  ELSIF v_account.type IN ('debt', 'loan') THEN
    v_current_balance := COALESCE(v_account.original_amount, v_account.balance) + v_transactions_total;
  ELSE
    v_current_balance := v_account.balance;
  END IF;

  RETURN v_current_balance;
END;
$$;
