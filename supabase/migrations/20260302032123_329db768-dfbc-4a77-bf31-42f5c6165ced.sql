
CREATE OR REPLACE FUNCTION public.email_match_completed()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID;
  _rec RECORD;
  _tname TEXT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT t.name INTO _tname FROM public.tournaments t WHERE t.id = NEW.tournament_id;

    FOREACH _uid IN ARRAY ARRAY[NEW.player1_id, NEW.player2_id] LOOP
      IF _uid IS NOT NULL AND public.should_notify(_uid, 'match_completed', 'email') THEN
        SELECT u.email INTO _rec FROM auth.users u WHERE u.id = _uid;
        IF _rec.email IS NOT NULL THEN
          PERFORM net.http_post(
            url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-notification-email',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
            body := jsonb_build_object(
              'type', 'match_completed',
              'record', to_jsonb(NEW),
              'target_email', _rec.email,
              'tournament_name', _tname
            )
          );
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_email_match_completed
  AFTER UPDATE ON public.match_results
  FOR EACH ROW
  EXECUTE FUNCTION public.email_match_completed();
