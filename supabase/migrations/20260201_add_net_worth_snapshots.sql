-- Net worth snapshots for historical tracking
CREATE TABLE public.net_worth_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_assets numeric(12,2) NOT NULL,
  total_liabilities numeric(12,2) NOT NULL,
  net_worth numeric(12,2) NOT NULL,
  snapshot_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots"
  ON public.net_worth_snapshots FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own snapshots"
  ON public.net_worth_snapshots FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_net_worth_snapshots_user_date
  ON public.net_worth_snapshots(user_id, snapshot_date DESC);

-- Function to create/update today's snapshot
CREATE OR REPLACE FUNCTION public.create_net_worth_snapshot(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_assets numeric;
  v_liabilities numeric;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN is_asset THEN balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN NOT is_asset THEN balance ELSE 0 END), 0)
  INTO v_assets, v_liabilities
  FROM public.accounts WHERE user_id = p_user_id;

  INSERT INTO public.net_worth_snapshots (user_id, total_assets, total_liabilities, net_worth, snapshot_date)
  VALUES (p_user_id, v_assets, v_liabilities, v_assets - v_liabilities, CURRENT_DATE)
  ON CONFLICT (user_id, snapshot_date)
  DO UPDATE SET total_assets = EXCLUDED.total_assets,
    total_liabilities = EXCLUDED.total_liabilities, net_worth = EXCLUDED.net_worth;
END;
$$;
