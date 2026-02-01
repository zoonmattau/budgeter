-- User preferences for leaderboard visibility
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  friends_leaderboard_visible boolean NOT NULL DEFAULT false,
  global_leaderboard_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL USING (user_id = auth.uid());

-- Create preferences for existing users
INSERT INTO public.user_preferences (user_id) SELECT id FROM public.profiles ON CONFLICT DO NOTHING;

-- Friends leaderboard (only friends who opted in)
CREATE OR REPLACE FUNCTION public.get_friends_leaderboard(p_user_id uuid)
RETURNS TABLE(user_id uuid, display_name text, net_worth numeric, rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH friend_ids AS (
    SELECT public.get_friends(p_user_id) AS fid UNION SELECT p_user_id
  ),
  visible AS (
    SELECT f.fid FROM friend_ids f
    JOIN public.user_preferences up ON up.user_id = f.fid
    WHERE up.friends_leaderboard_visible = true
  ),
  latest AS (
    SELECT DISTINCT ON (user_id) user_id, net_worth
    FROM public.net_worth_snapshots WHERE user_id IN (SELECT fid FROM visible)
    ORDER BY user_id, snapshot_date DESC
  )
  SELECT l.user_id, p.display_name, l.net_worth, RANK() OVER (ORDER BY l.net_worth DESC)
  FROM latest l JOIN public.profiles p ON p.id = l.user_id ORDER BY rank;
$$;

-- Global leaderboard (everyone who opted in)
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(p_limit int DEFAULT 100)
RETURNS TABLE(user_id uuid, display_name text, net_worth numeric, rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH visible AS (
    SELECT user_id FROM public.user_preferences WHERE global_leaderboard_visible = true
  ),
  latest AS (
    SELECT DISTINCT ON (user_id) user_id, net_worth
    FROM public.net_worth_snapshots WHERE user_id IN (SELECT user_id FROM visible)
    ORDER BY user_id, snapshot_date DESC
  )
  SELECT l.user_id, p.display_name, l.net_worth, RANK() OVER (ORDER BY l.net_worth DESC)
  FROM latest l JOIN public.profiles p ON p.id = l.user_id ORDER BY rank LIMIT p_limit;
$$;
