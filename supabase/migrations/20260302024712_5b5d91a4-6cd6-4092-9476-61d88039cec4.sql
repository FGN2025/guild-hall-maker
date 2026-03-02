
-- Replace old email challenge trigger with preference-aware version
DROP TRIGGER IF EXISTS trg_email_new_challenge ON public.challenges;

CREATE TRIGGER trg_email_new_challenge
  AFTER INSERT ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.email_new_challenge();
