
-- Drop old triggers that don't respect notification preferences
DROP TRIGGER IF EXISTS trg_redemption_status_notify ON public.prize_redemptions;
DROP TRIGGER IF EXISTS trg_email_redemption_status ON public.prize_redemptions;

-- Create new triggers using the preference-aware functions
CREATE TRIGGER trg_redemption_status_notify
  AFTER UPDATE ON public.prize_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_redemption_status();

CREATE TRIGGER trg_email_redemption_status
  AFTER UPDATE ON public.prize_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.email_redemption_status();
