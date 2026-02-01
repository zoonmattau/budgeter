-- Add friend_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE;
UPDATE public.profiles SET friend_code = UPPER(ENCODE(gen_random_bytes(4), 'hex')) WHERE friend_code IS NULL;

-- Friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
  ON public.friendships FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "Users can create friend requests"
  ON public.friendships FOR INSERT WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Addressee can update friendship"
  ON public.friendships FOR UPDATE USING (addressee_id = auth.uid());
CREATE POLICY "Users can delete own friendships"
  ON public.friendships FOR DELETE USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Lookup user by friend code
CREATE OR REPLACE FUNCTION public.get_user_by_friend_code(p_code TEXT)
RETURNS TABLE(id uuid, display_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id, display_name FROM public.profiles WHERE friend_code = UPPER(p_code) LIMIT 1;
$$;

-- Get user's accepted friends
CREATE OR REPLACE FUNCTION public.get_friends(p_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN requester_id = p_user_id THEN addressee_id ELSE requester_id END
  FROM public.friendships
  WHERE (requester_id = p_user_id OR addressee_id = p_user_id) AND status = 'accepted';
$$;
