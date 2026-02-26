
-- ============ CHALLENGES ============
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  game_id UUID REFERENCES public.games(id),
  points_reward INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  max_completions INTEGER,
  challenge_type TEXT NOT NULL DEFAULT 'one_time',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
ON public.challenges FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Moderators can manage challenges"
ON public.challenges FOR ALL TO authenticated
USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- ============ CHALLENGE COMPLETIONS ============
CREATE TABLE public.challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  awarded_points INTEGER NOT NULL DEFAULT 0,
  verified_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions"
ON public.challenge_completions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all completions"
ON public.challenge_completions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can manage completions"
ON public.challenge_completions FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can delete completions"
ON public.challenge_completions FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- ============ LADDERS ============
CREATE TABLE public.ladders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  game_id UUID REFERENCES public.games(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ladders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ladders"
ON public.ladders FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Moderators can manage ladders"
ON public.ladders FOR ALL TO authenticated
USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- ============ LADDER ENTRIES ============
CREATE TABLE public.ladder_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ladder_id UUID NOT NULL REFERENCES public.ladders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ladder_id, user_id)
);

ALTER TABLE public.ladder_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ladder entries"
ON public.ladder_entries FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can join ladders"
ON public.ladder_entries FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Moderators can manage ladder entries"
ON public.ladder_entries FOR ALL TO authenticated
USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- ============ PRIZE CATALOG ============
CREATE TABLE public.prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  points_cost INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active prizes"
ON public.prizes FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Moderators can manage prizes"
ON public.prizes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- ============ PRIZE REDEMPTIONS ============
CREATE TABLE public.prize_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prize_id UUID NOT NULL REFERENCES public.prizes(id),
  points_spent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prize_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions"
ON public.prize_redemptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can request redemptions"
ON public.prize_redemptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Moderators can view all redemptions"
ON public.prize_redemptions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can update redemptions"
ON public.prize_redemptions FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));
