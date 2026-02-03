-- Add credit limit field to accounts table for credit cards
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2);

-- Function to check if approaching credit limit
CREATE OR REPLACE FUNCTION public.get_credit_utilization(p_account_id uuid)
RETURNS TABLE(
  balance numeric,
  credit_limit numeric,
  utilization_percentage numeric,
  available_credit numeric
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_account public.accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_account FROM public.accounts WHERE id = p_account_id;

  IF NOT FOUND OR v_account.credit_limit IS NULL OR v_account.credit_limit = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_account.balance,
    v_account.credit_limit,
    ROUND((v_account.balance / v_account.credit_limit) * 100, 1),
    v_account.credit_limit - v_account.balance;
END;
$$;
