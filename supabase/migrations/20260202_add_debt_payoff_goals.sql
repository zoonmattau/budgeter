-- Add goal_type and linked_account_id to goals table for debt payoff tracking
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'savings' CHECK (goal_type IN ('savings', 'debt_payoff')),
ADD COLUMN IF NOT EXISTS linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Create index for faster lookups of debt payoff goals
CREATE INDEX IF NOT EXISTS idx_goals_linked_account ON goals(linked_account_id) WHERE linked_account_id IS NOT NULL;

-- Function to auto-complete debt payoff goals when account balance reaches 0 or positive
CREATE OR REPLACE FUNCTION check_debt_payoff_goals()
RETURNS TRIGGER AS $$
BEGIN
  -- If an account balance is updated and it's linked to a debt payoff goal
  IF NEW.balance <= 0 AND NEW.is_asset = false THEN
    -- Mark any active debt payoff goals linked to this account as completed
    UPDATE goals
    SET
      status = 'completed',
      current_amount = target_amount,
      updated_at = NOW()
    WHERE
      linked_account_id = NEW.id
      AND goal_type = 'debt_payoff'
      AND status = 'active';
  END IF;

  -- Update current_amount for debt payoff goals based on how much has been paid off
  UPDATE goals
  SET
    current_amount = GREATEST(0, target_amount - NEW.balance),
    updated_at = NOW()
  WHERE
    linked_account_id = NEW.id
    AND goal_type = 'debt_payoff'
    AND status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check debt payoff goals when account balance changes
DROP TRIGGER IF EXISTS trigger_check_debt_payoff_goals ON accounts;
CREATE TRIGGER trigger_check_debt_payoff_goals
AFTER UPDATE OF balance ON accounts
FOR EACH ROW
EXECUTE FUNCTION check_debt_payoff_goals();
