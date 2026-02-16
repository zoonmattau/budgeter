-- Ensure liabilities are treated as positive magnitudes for net worth math.
-- This fixes cases where liability accounts are stored as negative balances.

CREATE OR REPLACE FUNCTION public.create_net_worth_snapshot(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_assets numeric := 0;
  total_liabilities numeric := 0;
  accounts_count integer := 0;
BEGIN
  SELECT COUNT(*)
  INTO accounts_count
  FROM public.accounts
  WHERE user_id = p_user_id;

  IF accounts_count = 0 THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN is_asset THEN balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN NOT is_asset THEN ABS(balance) ELSE 0 END), 0)
  INTO total_assets, total_liabilities
  FROM public.accounts
  WHERE user_id = p_user_id;

  IF total_assets > 0 OR total_liabilities > 0 THEN
    INSERT INTO public.net_worth_snapshots (user_id, total_assets, total_liabilities, net_worth, snapshot_date)
    VALUES (p_user_id, total_assets, total_liabilities, total_assets - total_liabilities, CURRENT_DATE)
    ON CONFLICT (user_id, snapshot_date)
    DO UPDATE SET
      total_assets = EXCLUDED.total_assets,
      total_liabilities = EXCLUDED.total_liabilities,
      net_worth = EXCLUDED.net_worth;
  END IF;
END;
$$;

-- Normalize any already-stored negative liabilities in snapshots.
UPDATE public.net_worth_snapshots
SET
  total_liabilities = ABS(total_liabilities),
  net_worth = total_assets - ABS(total_liabilities)
WHERE total_liabilities < 0;
