CREATE OR REPLACE FUNCTION public.deduct_points_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _score_id uuid;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT id INTO _score_id
    FROM public.season_scores
    WHERE user_id = NEW.user_id
      AND season_id IN (SELECT s.id FROM public.seasons s WHERE s.status = 'active')
      AND points_available >= NEW.points_spent
    ORDER BY points_available DESC
    LIMIT 1
    FOR UPDATE;

    IF _score_id IS NULL THEN
      RAISE EXCEPTION 'Insufficient available points';
    END IF;

    UPDATE public.season_scores
    SET points_available = points_available - NEW.points_spent
    WHERE id = _score_id;
  END IF;
  RETURN NEW;
END;
$$;