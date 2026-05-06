ALTER TABLE public.prizes
  ADD COLUMN IF NOT EXISTS max_per_user_per_month integer;

CREATE OR REPLACE FUNCTION public.enforce_prize_redemption_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _qty integer;
  _cap integer;
  _used integer;
  _name text;
BEGIN
  SELECT quantity_available, max_per_user_per_month, name
    INTO _qty, _cap, _name
  FROM public.prizes WHERE id = NEW.prize_id;

  IF _qty IS NOT NULL AND _qty <= 0 THEN
    RAISE EXCEPTION '"%" is out of stock.', COALESCE(_name, 'This prize')
      USING ERRCODE = 'check_violation';
  END IF;

  IF _cap IS NOT NULL THEN
    SELECT COUNT(*) INTO _used
    FROM public.prize_redemptions
    WHERE user_id = NEW.user_id
      AND prize_id = NEW.prize_id
      AND status IN ('pending','approved','fulfilled')
      AND created_at >= date_trunc('month', now())
      AND created_at <  date_trunc('month', now()) + interval '1 month';

    IF _used >= _cap THEN
      RAISE EXCEPTION 'Monthly redemption limit reached for "%": % per month.', COALESCE(_name, 'this prize'), _cap
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_prize_redemption_limits ON public.prize_redemptions;
CREATE TRIGGER trg_enforce_prize_redemption_limits
  BEFORE INSERT ON public.prize_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_prize_redemption_limits();