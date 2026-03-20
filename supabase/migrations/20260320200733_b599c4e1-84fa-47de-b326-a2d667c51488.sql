
-- Trigger function: notify player on point adjustment (in-app + email)
CREATE OR REPLACE FUNCTION public.notify_point_adjustment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _title TEXT;
  _message TEXT;
  _type TEXT;
  _email TEXT;
BEGIN
  IF NEW.points_change > 0 THEN
    _type := 'success';
    _title := 'Points Awarded';
    _message := 'You received ' || NEW.points_change || ' points' ||
      CASE WHEN NEW.reason IS NOT NULL AND NEW.reason <> '' THEN ': ' || NEW.reason ELSE '' END;
  ELSE
    _type := 'warning';
    _title := 'Points Deducted';
    _message := ABS(NEW.points_change) || ' points were deducted' ||
      CASE WHEN NEW.reason IS NOT NULL AND NEW.reason <> '' THEN ': ' || NEW.reason ELSE '' END;
  END IF;

  -- In-app notification
  IF public.should_notify(NEW.user_id, 'points_adjusted', 'in_app') THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.user_id, _type, _title, _message, '/leaderboard');
  END IF;

  -- Email notification
  IF public.should_notify(NEW.user_id, 'points_adjusted', 'email') THEN
    SELECT u.email INTO _email FROM auth.users u WHERE u.id = NEW.user_id;
    IF _email IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-notification-email',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
        body := jsonb_build_object(
          'type', 'points_adjusted',
          'record', to_jsonb(NEW),
          'target_email', _email
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to point_adjustments table
CREATE TRIGGER trg_notify_point_adjustment
  AFTER INSERT ON public.point_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_point_adjustment();
