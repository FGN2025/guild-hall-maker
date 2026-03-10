
-- 1. quest_chains table
CREATE TABLE public.quest_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  story_intro text,
  story_outro text,
  cover_image_url text,
  bonus_points integer NOT NULL DEFAULT 0,
  bonus_achievement_id uuid REFERENCES public.achievement_definitions(id) ON DELETE SET NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_chains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view active quest chains" ON public.quest_chains
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Authenticated can view active quest chains" ON public.quest_chains
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Moderators can manage quest chains" ON public.quest_chains
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 2. New columns on quests
ALTER TABLE public.quests
  ADD COLUMN chain_id uuid REFERENCES public.quest_chains(id) ON DELETE SET NULL,
  ADD COLUMN chain_order integer NOT NULL DEFAULT 0,
  ADD COLUMN story_intro text,
  ADD COLUMN story_outro text,
  ADD COLUMN xp_reward integer NOT NULL DEFAULT 0;

-- 3. player_quest_xp table
CREATE TABLE public.player_quest_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_xp integer NOT NULL DEFAULT 0,
  quest_rank text NOT NULL DEFAULT 'novice',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_quest_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quest xp" ON public.player_quest_xp
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all quest xp" ON public.player_quest_xp
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage quest xp" ON public.player_quest_xp
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 4. quest_chain_completions table
CREATE TABLE public.quest_chain_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chain_id uuid NOT NULL REFERENCES public.quest_chains(id) ON DELETE CASCADE,
  bonus_points_awarded integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, chain_id)
);

ALTER TABLE public.quest_chain_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chain completions" ON public.quest_chain_completions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Moderators can manage chain completions" ON public.quest_chain_completions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 5. Function to compute quest rank from XP
CREATE OR REPLACE FUNCTION public.compute_quest_rank(xp integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN xp >= 1000 THEN 'master'
    WHEN xp >= 600 THEN 'expert'
    WHEN xp >= 300 THEN 'journeyman'
    WHEN xp >= 100 THEN 'apprentice'
    ELSE 'novice'
  END;
$$;

-- 6. Trigger function: update XP on quest completion
CREATE OR REPLACE FUNCTION public.trg_quest_xp_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp integer;
  v_chain_id uuid;
  v_chain_quest_count integer;
  v_user_completed_count integer;
  v_bonus integer;
  v_already_completed boolean;
BEGIN
  -- Get xp_reward and chain_id from the quest
  SELECT xp_reward, chain_id INTO v_xp, v_chain_id
  FROM public.quests WHERE id = NEW.quest_id;

  -- Upsert player XP
  IF v_xp > 0 THEN
    INSERT INTO public.player_quest_xp (user_id, total_xp, quest_rank, updated_at)
    VALUES (NEW.user_id, v_xp, compute_quest_rank(v_xp), now())
    ON CONFLICT (user_id) DO UPDATE SET
      total_xp = player_quest_xp.total_xp + v_xp,
      quest_rank = compute_quest_rank(player_quest_xp.total_xp + v_xp),
      updated_at = now();
  END IF;

  -- Check chain completion
  IF v_chain_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.quest_chain_completions
      WHERE user_id = NEW.user_id AND chain_id = v_chain_id
    ) INTO v_already_completed;

    IF NOT v_already_completed THEN
      SELECT COUNT(*) INTO v_chain_quest_count
      FROM public.quests WHERE chain_id = v_chain_id;

      SELECT COUNT(*) INTO v_user_completed_count
      FROM public.quest_completions qc
      JOIN public.quests q ON q.id = qc.quest_id
      WHERE qc.user_id = NEW.user_id AND q.chain_id = v_chain_id;

      IF v_user_completed_count >= v_chain_quest_count THEN
        SELECT bonus_points INTO v_bonus
        FROM public.quest_chains WHERE id = v_chain_id;

        INSERT INTO public.quest_chain_completions (user_id, chain_id, bonus_points_awarded)
        VALUES (NEW.user_id, v_chain_id, COALESCE(v_bonus, 0));
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Create trigger
CREATE TRIGGER trg_quest_xp_after_completion
  AFTER INSERT ON public.quest_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_quest_xp_on_completion();
