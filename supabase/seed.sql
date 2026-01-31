-- Seed data for local development
-- This creates a test user and sample data

-- Note: In local development, you can create a user via the Auth UI
-- or use the Supabase dashboard. This seed focuses on app data.

-- Sample data will be created through the app's signup flow.
-- The handle_new_user() trigger automatically creates:
-- 1. A profile for the user
-- 2. Default spending categories
-- 3. User stats for gamification

-- If you want to pre-populate data for testing, you can insert after
-- creating a test user. Get the user ID from supabase auth.users table.

-- Example (replace USER_ID with actual UUID after creating test user):
/*
DO $$
DECLARE
  test_user_id uuid := 'YOUR-USER-ID-HERE';
  current_month date := date_trunc('month', current_date);
BEGIN
  -- Sample income
  INSERT INTO income_entries (user_id, month, source, amount, is_recurring)
  VALUES
    (test_user_id, current_month, 'Salary', 5500, true),
    (test_user_id, current_month, 'Side Hustle', 500, false);

  -- Sample goals
  INSERT INTO goals (user_id, name, target_amount, current_amount, deadline, visual_type)
  VALUES
    (test_user_id, 'Bali Holiday', 5000, 1250, current_date + interval '6 months', 'plant'),
    (test_user_id, 'Emergency Fund', 10000, 3500, current_date + interval '12 months', 'plant'),
    (test_user_id, 'New Laptop', 2000, 800, current_date + interval '3 months', 'plant');

  -- Sample accounts
  INSERT INTO accounts (user_id, name, type, balance, is_asset, institution)
  VALUES
    (test_user_id, 'Everyday Account', 'bank', 2500, true, 'CommBank'),
    (test_user_id, 'Savings Account', 'bank', 8500, true, 'ING'),
    (test_user_id, 'Credit Card', 'credit', 1200, false, 'CommBank'),
    (test_user_id, 'HECS Debt', 'debt', 25000, false, null);

  -- Sample bills (get category IDs first)
  INSERT INTO bills (user_id, category_id, name, amount, frequency, due_day, next_due)
  SELECT
    test_user_id,
    c.id,
    b.name,
    b.amount,
    b.frequency,
    b.due_day,
    b.next_due
  FROM (VALUES
    ('Utilities', 'Electricity', 150, 'quarterly', 15, current_date + interval '1 month'),
    ('Utilities', 'Internet', 79, 'monthly', 1, current_date + interval '5 days'),
    ('Subscriptions', 'Netflix', 22.99, 'monthly', 10, current_date + interval '10 days'),
    ('Subscriptions', 'Spotify', 12.99, 'monthly', 5, current_date + interval '5 days'),
    ('Rent/Mortgage', 'Rent', 1800, 'monthly', 1, current_date + interval '1 day')
  ) AS b(category_name, name, amount, frequency, due_day, next_due)
  JOIN categories c ON c.name = b.category_name AND c.user_id = test_user_id;

  -- Mark onboarding complete
  UPDATE profiles SET onboarding_completed = true WHERE id = test_user_id;

END $$;
*/

-- Helpful queries for development:

-- List all categories for a user:
-- SELECT * FROM categories WHERE user_id = 'USER_ID' ORDER BY type, sort_order;

-- Check budget vs spending:
-- SELECT c.name, b.allocated, COALESCE(SUM(t.amount), 0) as spent
-- FROM categories c
-- LEFT JOIN budgets b ON b.category_id = c.id
-- LEFT JOIN transactions t ON t.category_id = c.id AND t.date >= date_trunc('month', current_date)
-- WHERE c.user_id = 'USER_ID' AND c.type = 'expense'
-- GROUP BY c.id, c.name, b.allocated;
