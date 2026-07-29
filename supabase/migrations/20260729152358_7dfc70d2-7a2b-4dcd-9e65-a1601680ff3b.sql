ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS participation_tier text;

CREATE OR REPLACE FUNCTION public.validate_participation_tier()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.participation_tier IS NOT NULL AND NEW.participation_tier NOT IN ('long','short') THEN
    RAISE EXCEPTION 'participation_tier must be long, short, or null';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_participation_tier ON public.tournament_registrations;
CREATE TRIGGER trg_validate_participation_tier
  BEFORE INSERT OR UPDATE ON public.tournament_registrations
  FOR EACH ROW EXECUTE FUNCTION public.validate_participation_tier();