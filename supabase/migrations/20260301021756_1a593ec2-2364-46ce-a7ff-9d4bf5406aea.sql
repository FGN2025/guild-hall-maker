
-- Add points_available to season_scores
ALTER TABLE public.season_scores
  ADD COLUMN IF NOT EXISTS points_available integer NOT NULL DEFAULT 0;

-- Add prize distribution percentage columns to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS prize_pct_first integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS prize_pct_second integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS prize_pct_third integer NOT NULL DEFAULT 20;

-- Backfill: set points_available = points - already_spent
UPDATE public.season_scores ss
SET points_available = GREATEST(0, ss.points - COALESCE(
  (SELECT SUM(pr.points_spent) FROM public.prize_redemptions pr
   WHERE pr.user_id = ss.user_id AND pr.status IN ('approved','fulfilled')),
  0));

-- Trigger: auto-deduct points_available on redemption approval
CREATE OR REPLACE FUNCTION public.deduct_points_on_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.season_scores
    SET points_available = points_available - NEW.points_spent
    WHERE user_id = NEW.user_id
      AND season_id = (SELECT id FROM public.seasons WHERE status = 'active' LIMIT 1)
      AND points_available >= NEW.points_spent;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient available points';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_points_on_approval
  BEFORE UPDATE ON public.prize_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.deduct_points_on_approval();

-- Trigger: notify moderators when tournament final match completes
CREATE OR REPLACE FUNCTION public.notify_moderators_tournament_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  _max_round integer;
  _tname text;
  _uid uuid;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT MAX(round) INTO _max_round
    FROM public.match_results WHERE tournament_id = NEW.tournament_id;
    IF NEW.round = _max_round THEN
      SELECT name INTO _tname FROM public.tournaments WHERE id = NEW.tournament_id;
      FOR _uid IN
        SELECT ur.user_id FROM public.user_roles ur
        WHERE ur.role IN ('moderator', 'admin')
      LOOP
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (_uid, 'info',
          'Tournament Placements Need Validation',
          '"' || _tname || '" final match is complete. Please validate 1st, 2nd, and 3rd place results.',
          '/moderator/tournaments');
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_mods_tournament_complete
  AFTER UPDATE ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.notify_moderators_tournament_complete();
