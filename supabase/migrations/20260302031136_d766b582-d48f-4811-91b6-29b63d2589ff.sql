
-- Create email trigger function for tournament_starting
CREATE OR REPLACE FUNCTION public.email_tournament_starting()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _rec RECORD;
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM NEW.status THEN
    FOR _rec IN
      SELECT p.user_id, u.email
      FROM public.tournament_registrations tr
      JOIN public.profiles p ON p.user_id = tr.user_id
      JOIN auth.users u ON u.id = tr.user_id
      WHERE tr.tournament_id = NEW.id AND tr.status = 'registered'
    LOOP
      IF public.should_notify(_rec.user_id, 'tournament_starting', 'email') THEN
        PERFORM net.http_post(
          url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-notification-email',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
          body := jsonb_build_object(
            'type', 'tournament_starting',
            'record', to_jsonb(NEW),
            'target_email', _rec.email
          )
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- Attach trigger to tournaments table
CREATE TRIGGER trg_email_tournament_starting
  AFTER UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.email_tournament_starting();
