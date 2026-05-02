-- 1. Verification metadata on challenge_tasks
ALTER TABLE public.challenge_tasks
  ADD COLUMN IF NOT EXISTS verification_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS steam_achievement_api_name text,
  ADD COLUMN IF NOT EXISTS steam_playtime_minutes integer;

-- Validation trigger (no CHECK constraints per project rule)
CREATE OR REPLACE FUNCTION public.validate_challenge_task_verification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_type NOT IN ('manual', 'steam_achievement', 'steam_playtime') THEN
    RAISE EXCEPTION 'Invalid verification_type: %', NEW.verification_type;
  END IF;

  IF NEW.verification_type = 'steam_achievement'
     AND (NEW.steam_achievement_api_name IS NULL OR length(trim(NEW.steam_achievement_api_name)) = 0) THEN
    RAISE EXCEPTION 'steam_achievement_api_name is required when verification_type = steam_achievement';
  END IF;

  IF NEW.verification_type = 'steam_playtime'
     AND (NEW.steam_playtime_minutes IS NULL OR NEW.steam_playtime_minutes <= 0) THEN
    RAISE EXCEPTION 'steam_playtime_minutes must be > 0 when verification_type = steam_playtime';
  END IF;

  IF NEW.verification_type = 'manual' THEN
    NEW.steam_achievement_api_name := NULL;
    NEW.steam_playtime_minutes := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_challenge_task_verification ON public.challenge_tasks;
CREATE TRIGGER trg_validate_challenge_task_verification
  BEFORE INSERT OR UPDATE ON public.challenge_tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_challenge_task_verification();

-- 2. Steam playtime cache table
CREATE TABLE IF NOT EXISTS public.steam_player_playtime (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  steam_app_id text NOT NULL,
  minutes_played integer NOT NULL DEFAULT 0,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, steam_app_id)
);

ALTER TABLE public.steam_player_playtime ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own steam playtime" ON public.steam_player_playtime;
CREATE POLICY "Users view own steam playtime"
  ON public.steam_player_playtime FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all steam playtime" ON public.steam_player_playtime;
CREATE POLICY "Admins view all steam playtime"
  ON public.steam_player_playtime FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_steam_player_playtime_user
  ON public.steam_player_playtime (user_id);