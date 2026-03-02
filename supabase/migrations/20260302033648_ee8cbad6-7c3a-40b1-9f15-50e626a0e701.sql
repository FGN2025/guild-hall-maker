
CREATE OR REPLACE FUNCTION public.email_registration_confirmed()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _tname TEXT;
  _email TEXT;
BEGIN
  SELECT name INTO _tname FROM public.tournaments WHERE id = NEW.tournament_id;

  IF public.should_notify(NEW.user_id, 'registration_confirmed', 'email') THEN
    SELECT u.email INTO _email FROM auth.users u WHERE u.id = NEW.user_id;
    IF _email IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-notification-email',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
        body := jsonb_build_object(
          'type', 'registration_confirmed',
          'record', to_jsonb(NEW),
          'target_email', _email,
          'tournament_name', _tname
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_email_registration_confirmed
  AFTER INSERT ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.email_registration_confirmed();
