
-- Fix email_redemption_status: use correct Supabase URL and matching payload format
CREATE OR REPLACE FUNCTION public.email_redemption_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _prize_name TEXT;
BEGIN
  IF NEW.status IN ('approved','fulfilled','denied') AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF public.should_notify(NEW.user_id, 'redemption_update', 'email') THEN
      SELECT name INTO _prize_name FROM public.prizes WHERE id = NEW.prize_id;

      PERFORM net.http_post(
        url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-notification-email',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
        body := jsonb_build_object(
          'type', 'redemption_update',
          'record', to_jsonb(NEW),
          'old_record', to_jsonb(OLD)
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix email_new_challenge: use correct Supabase URL and matching payload format
CREATE OR REPLACE FUNCTION public.email_new_challenge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_active = true THEN
    IF public.should_notify(NEW.user_id, 'new_challenge', 'email') THEN
      PERFORM net.http_post(
        url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-notification-email',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
        body := jsonb_build_object(
          'type', 'new_challenge',
          'record', to_jsonb(NEW)
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
