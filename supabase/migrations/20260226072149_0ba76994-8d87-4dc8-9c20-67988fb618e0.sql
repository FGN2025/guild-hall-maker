
CREATE OR REPLACE FUNCTION public.decrement_prize_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.prizes
    SET quantity_available = quantity_available - 1
    WHERE id = NEW.prize_id
      AND quantity_available IS NOT NULL
      AND quantity_available > 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decrement_prize_stock
  AFTER UPDATE ON public.prize_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_prize_stock();
