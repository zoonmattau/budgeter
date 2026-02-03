-- Update create_net_worth_snapshot to only create snapshots when user has accounts
-- This prevents $0 snapshots from being created before user sets up their accounts

CREATE OR REPLACE FUNCTION public.create_net_worth_snapshot(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_assets numeric;
  v_liabilities numeric;
  v_account_count integer;
BEGIN
  -- Count accounts and get totals
  SELECT
    COALESCE(SUM(CASE WHEN is_asset THEN balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN NOT is_asset THEN balance ELSE 0 END), 0),
    COUNT(*)
  INTO v_assets, v_liabilities, v_account_count
  FROM public.accounts WHERE user_id = p_user_id;

  -- Only create snapshot if user has at least one account
  -- This prevents $0 snapshots from polluting the history
  IF v_account_count > 0 THEN
    INSERT INTO public.net_worth_snapshots (user_id, total_assets, total_liabilities, net_worth, snapshot_date)
    VALUES (p_user_id, v_assets, v_liabilities, v_assets - v_liabilities, CURRENT_DATE)
    ON CONFLICT (user_id, snapshot_date)
    DO UPDATE SET total_assets = EXCLUDED.total_assets,
      total_liabilities = EXCLUDED.total_liabilities, net_worth = EXCLUDED.net_worth;
  END IF;
END;
$$;

-- Delete any $0 snapshots where user had no accounts at the time
-- These are created when user visits dashboard before adding accounts
DELETE FROM public.net_worth_snapshots
WHERE net_worth = 0 AND total_assets = 0 AND total_liabilities = 0;
