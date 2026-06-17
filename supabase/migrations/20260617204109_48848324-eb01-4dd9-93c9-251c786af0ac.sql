
-- 1. Attendance fields on tournament_registrations
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS attended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid;

-- 2. Trigger: mark attended when a player appears in a completed match
CREATE OR REPLACE FUNCTION public.mark_attended_from_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE public.tournament_registrations
      SET attended = true,
          checked_in_at = COALESCE(checked_in_at, now())
    WHERE tournament_id = NEW.tournament_id
      AND user_id IN (NEW.player1_id, NEW.player2_id)
      AND attended = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_attended_from_match ON public.match_results;
CREATE TRIGGER trg_mark_attended_from_match
AFTER INSERT OR UPDATE OF status, winner_id ON public.match_results
FOR EACH ROW EXECUTE FUNCTION public.mark_attended_from_match();

-- 3. Backfill: any registration whose user has a completed match is attended
UPDATE public.tournament_registrations tr
SET attended = true,
    checked_in_at = COALESCE(tr.checked_in_at, now())
FROM public.match_results mr
WHERE mr.tournament_id = tr.tournament_id
  AND mr.status = 'completed'
  AND tr.user_id IN (mr.player1_id, mr.player2_id)
  AND tr.attended = false;

-- 4. Idempotency: one participation award per tournament per user
CREATE UNIQUE INDEX IF NOT EXISTS match_point_awards_participation_uniq
  ON public.match_point_awards (tournament_id, user_id)
  WHERE kind = 'participation';
