-- Normalize debt payoff goals to handle both positive and negative account balance conventions.
-- Debt should be measured by absolute balance remaining, not by sign.

-- Backfill existing debt payoff goals from linked account balances.
UPDATE goals g
SET
  target_amount = normalized.total_debt,
  starting_amount = normalized.total_debt,
  current_amount = CASE
    WHEN normalized.account_debt <= 0.01 THEN normalized.total_debt
    ELSE GREATEST(0, normalized.total_debt - normalized.account_debt)
  END,
  status = CASE
    WHEN normalized.account_debt <= 0.01 THEN 'completed'
    WHEN g.status = 'completed' THEN 'active'
    ELSE g.status
  END,
  updated_at = NOW()
FROM (
  SELECT
    g2.id,
    ABS(COALESCE(a.balance, 0)) AS account_debt,
    GREATEST(
      ABS(COALESCE(g2.target_amount, 0)),
      ABS(COALESCE(g2.starting_amount, 0)),
      ABS(COALESCE(a.balance, 0))
    ) AS total_debt
  FROM goals g2
  JOIN accounts a ON a.id = g2.linked_account_id
  WHERE g2.goal_type = 'debt_payoff'
) AS normalized
WHERE g.id = normalized.id;

-- Trigger function: update debt payoff progress using absolute debt remaining.
CREATE OR REPLACE FUNCTION check_debt_payoff_goals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE goals g
  SET
    target_amount = normalized.total_debt,
    starting_amount = normalized.total_debt,
    current_amount = CASE
      WHEN normalized.account_debt <= 0.01 THEN normalized.total_debt
      ELSE GREATEST(0, normalized.total_debt - normalized.account_debt)
    END,
    status = CASE
      WHEN normalized.account_debt <= 0.01 THEN 'completed'
      ELSE g.status
    END,
    updated_at = NOW()
  FROM (
    SELECT
      id,
      ABS(COALESCE(NEW.balance, 0)) AS account_debt,
      GREATEST(
        ABS(COALESCE(target_amount, 0)),
        ABS(COALESCE(starting_amount, 0)),
        ABS(COALESCE(NEW.balance, 0))
      ) AS total_debt
    FROM goals
    WHERE linked_account_id = NEW.id
      AND goal_type = 'debt_payoff'
      AND status = 'active'
  ) AS normalized
  WHERE g.id = normalized.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
