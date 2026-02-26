
-- Notification preferences per user
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,        -- e.g. 'redemption_update', 'new_challenge'
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Helper function to check if a user wants a notification channel
CREATE OR REPLACE FUNCTION public.should_notify(
  _user_id UUID,
  _type TEXT,
  _channel TEXT  -- 'in_app' or 'email'
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _enabled BOOLEAN;
BEGIN
  IF _channel = 'in_app' THEN
    SELECT in_app_enabled INTO _enabled
    FROM public.notification_preferences
    WHERE user_id = _user_id AND notification_type = _type;
  ELSIF _channel = 'email' THEN
    SELECT email_enabled INTO _enabled
    FROM public.notification_preferences
    WHERE user_id = _user_id AND notification_type = _type;
  END IF;
  -- Default to true if no preference row exists
  RETURN COALESCE(_enabled, true);
END;
$$;

-- Update the redemption notification trigger to respect preferences
CREATE OR REPLACE FUNCTION public.notify_redemption_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('approved','fulfilled','denied') AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF public.should_notify(NEW.user_id, 'redemption_update', 'in_app') THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        NEW.user_id,
        CASE WHEN NEW.status = 'denied' THEN 'warning' ELSE 'success' END,
        'Prize Redemption ' || initcap(NEW.status),
        'Your redemption for "' ||
          (SELECT name FROM public.prizes WHERE id = NEW.prize_id) ||
          '" has been ' || NEW.status || '.',
        '/prize-shop'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Update the new challenge notification trigger to respect preferences
CREATE OR REPLACE FUNCTION public.notify_new_challenge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _uid UUID;
BEGIN
  IF NEW.is_active = true THEN
    FOR _uid IN SELECT user_id FROM public.profiles LOOP
      IF public.should_notify(_uid, 'new_challenge', 'in_app') THEN
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (
          _uid,
          'info',
          'New Challenge Available',
          '"' || NEW.name || '" — earn ' || NEW.points_reward || ' points!',
          '/challenges'
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Update email trigger for redemptions to respect preferences
CREATE OR REPLACE FUNCTION public.email_redemption_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _email TEXT;
  _prize_name TEXT;
  _base TEXT;
BEGIN
  IF NEW.status IN ('approved','fulfilled','denied') AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF public.should_notify(NEW.user_id, 'redemption_update', 'email') THEN
      SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
      SELECT name INTO _prize_name FROM public.prizes WHERE id = NEW.prize_id;
      SELECT value INTO _base FROM public.app_settings WHERE key = 'site_url';
      _base := COALESCE(_base, 'https://guild-hall-maker.lovable.app');

      PERFORM net.http_post(
        url := _base || '/functions/v1/send-notification-email',
        body := jsonb_build_object(
          'to', _email,
          'type', 'redemption_update',
          'prize_name', _prize_name,
          'status', NEW.status
        ),
        headers := jsonb_build_object('Content-Type','application/json')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Update email trigger for new challenges to respect preferences
CREATE OR REPLACE FUNCTION public.email_new_challenge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _rec RECORD;
  _base TEXT;
BEGIN
  IF NEW.is_active = true THEN
    SELECT value INTO _base FROM public.app_settings WHERE key = 'site_url';
    _base := COALESCE(_base, 'https://guild-hall-maker.lovable.app');

    FOR _rec IN
      SELECT p.user_id, u.email
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.user_id
    LOOP
      IF public.should_notify(_rec.user_id, 'new_challenge', 'email') THEN
        PERFORM net.http_post(
          url := _base || '/functions/v1/send-notification-email',
          body := jsonb_build_object(
            'to', _rec.email,
            'type', 'new_challenge',
            'challenge_name', NEW.name,
            'points_reward', NEW.points_reward
          ),
          headers := jsonb_build_object('Content-Type','application/json')
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
