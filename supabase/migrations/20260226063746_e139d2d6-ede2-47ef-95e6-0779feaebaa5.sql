-- Trigger function to send email on redemption status change
CREATE OR REPLACE FUNCTION public.email_on_redemption_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'fulfilled', 'denied') THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
      ),
      body := jsonb_build_object(
        'type', 'redemption_update',
        'record', to_jsonb(NEW),
        'old_record', to_jsonb(OLD)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function to send email on new challenge
CREATE OR REPLACE FUNCTION public.email_on_new_challenge()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_active = true THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
      ),
      body := jsonb_build_object(
        'type', 'new_challenge',
        'record', to_jsonb(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_email_redemption_status
  AFTER UPDATE ON public.prize_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.email_on_redemption_status_change();

CREATE TRIGGER trg_email_new_challenge
  AFTER INSERT ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.email_on_new_challenge();