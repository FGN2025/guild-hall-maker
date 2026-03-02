
-- Fix email_new_challenge to pass target_email per user so the edge function sends to just that user
CREATE OR REPLACE FUNCTION public.email_new_challenge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rec RECORD;
BEGIN
  IF NEW.is_active = true THEN
    FOR _rec IN
      SELECT p.user_id, u.email
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.user_id
    LOOP
      IF public.should_notify(_rec.user_id, 'new_challenge', 'email') THEN
        PERFORM net.http_post(
          url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-notification-email',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
          body := jsonb_build_object(
            'type', 'new_challenge',
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
