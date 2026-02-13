-- Add net_worth_milestone as a valid goal_type
-- Drop the existing check constraint and recreate with new value
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_goal_type_check;
ALTER TABLE goals ADD CONSTRAINT goals_goal_type_check
  CHECK (goal_type IN ('savings', 'debt_payoff', 'net_worth_milestone'));
