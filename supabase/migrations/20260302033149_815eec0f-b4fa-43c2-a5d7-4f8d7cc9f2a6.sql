
CREATE OR REPLACE FUNCTION public.email_achievement_earned()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _aname TEXT;
  _tier TEXT;
  _email TEXT;
BEGIN
  SELECT name, tier INTO _aname, _tier
  FROM public.achievement_definitions WHERE id = NEW.achievement_id;

  IF public.should_notify(NEW.user_id, 'achievement_earned', 'email') THEN
    SELECT u.email INTO _email FROM auth.users u WHERE u.id = NEW.user_id;
    IF _email IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-notification-email',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
        body := jsonb_build_object(
          'type', 'achievement_earned',
          'record', to_jsonb(NEW),
          'target_email', _email,
          'achievement_name', _aname,
          'achievement_tier', _tier
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_email_achievement_earned
  AFTER INSERT ON public.player_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.email_achievement_earned();
