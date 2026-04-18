
-- ============================================================
-- 1. Normalize existing difficulty casing
-- ============================================================
UPDATE public.challenges SET difficulty = lower(difficulty) WHERE difficulty IS NOT NULL AND difficulty <> lower(difficulty);
UPDATE public.quests SET difficulty = lower(difficulty) WHERE difficulty IS NOT NULL AND difficulty <> lower(difficulty);
-- Tournaments may use 'difficulty' too; guard with information_schema check via DO block
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tournaments' AND column_name='difficulty') THEN
    EXECUTE 'UPDATE public.tournaments SET difficulty = lower(difficulty) WHERE difficulty IS NOT NULL AND difficulty <> lower(difficulty)';
  END IF;
END$$;

-- ============================================================
-- 2. Add override tracking columns
-- ============================================================
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS points_override_reason text,
  ADD COLUMN IF NOT EXISTS points_overridden_by uuid;

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS points_override_reason text,
  ADD COLUMN IF NOT EXISTS points_overridden_by uuid;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS points_override_reason text,
  ADD COLUMN IF NOT EXISTS points_overridden_by uuid;

-- ============================================================
-- 3. Validation trigger to enforce lowercase difficulty
-- ============================================================
CREATE OR REPLACE FUNCTION public.normalize_difficulty()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.difficulty IS NOT NULL THEN
    NEW.difficulty := lower(NEW.difficulty);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_challenge_difficulty ON public.challenges;
CREATE TRIGGER normalize_challenge_difficulty
  BEFORE INSERT OR UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.normalize_difficulty();

DROP TRIGGER IF EXISTS normalize_quest_difficulty ON public.quests;
CREATE TRIGGER normalize_quest_difficulty
  BEFORE INSERT OR UPDATE ON public.quests
  FOR EACH ROW EXECUTE FUNCTION public.normalize_difficulty();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tournaments' AND column_name='difficulty') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS normalize_tournament_difficulty ON public.tournaments';
    EXECUTE 'CREATE TRIGGER normalize_tournament_difficulty BEFORE INSERT OR UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.normalize_difficulty()';
  END IF;
END$$;

-- ============================================================
-- 4. Realignment log table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.points_realignment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('challenge','quest','tournament')),
  item_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value integer,
  new_value integer,
  rubric_version integer NOT NULL DEFAULT 1,
  performed_by uuid NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  batch_id uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_realign_log_batch ON public.points_realignment_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_realign_log_item ON public.points_realignment_log(item_type, item_id);

ALTER TABLE public.points_realignment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view realign log"
  ON public.points_realignment_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert realign log"
  ON public.points_realignment_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Rubric audit table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.points_rubric_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  previous_value jsonb,
  new_value jsonb NOT NULL,
  note text
);

ALTER TABLE public.points_rubric_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rubric audit"
  ON public.points_rubric_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert rubric audit"
  ON public.points_rubric_audit FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. Seed default rubric into app_settings
-- ============================================================
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'points_rubric_config',
  jsonb_build_object(
    'version', 1,
    'enforcement', 'suggest',
    'challenges', jsonb_build_object(
      'beginner',     jsonb_build_object('daily',5,'weekly',10,'monthly',20,'one_time',15),
      'intermediate', jsonb_build_object('daily',8,'weekly',15,'monthly',35,'one_time',25),
      'advanced',     jsonb_build_object('daily',12,'weekly',25,'monthly',50,'one_time',40)
    ),
    'quests', jsonb_build_object(
      'beginner',     jsonb_build_object('daily',5,'weekly',10,'monthly',20,'one_time',15),
      'intermediate', jsonb_build_object('daily',8,'weekly',15,'monthly',35,'one_time',25),
      'advanced',     jsonb_build_object('daily',12,'weekly',25,'monthly',50,'one_time',40)
    ),
    'quest_chain_bonus_multiplier', 0.25,
    'tournaments', jsonb_build_object(
      'participation', jsonb_build_object('beginner',3,'intermediate',5,'advanced',8),
      'placement_multipliers', jsonb_build_object('first',5,'second',3,'third',2)
    ),
    'prize_bands', jsonb_build_object(
      'common',    jsonb_build_array(50,150),
      'rare',      jsonb_build_array(200,400),
      'epic',      jsonb_build_array(500,800),
      'legendary', jsonb_build_array(1000,5000)
    ),
    'deviation_warning_threshold', 0.25
  )::text,
  'Central points rubric used by Challenges, Quests, Tournaments, and Prize Shop. Edit via /admin/points-rubric.'
)
ON CONFLICT (key) DO NOTHING;
