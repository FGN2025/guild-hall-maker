-- Notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, is_read, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Service role / triggers can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function: notify on prize redemption status change
CREATE OR REPLACE FUNCTION public.notify_redemption_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _prize_name text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'fulfilled', 'denied') THEN
    SELECT name INTO _prize_name FROM public.prizes WHERE id = NEW.prize_id;
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      CASE WHEN NEW.status = 'denied' THEN 'warning' ELSE 'success' END,
      'Prize Redemption ' || initcap(NEW.status),
      'Your redemption request for "' || COALESCE(_prize_name, 'a prize') || '" has been ' || NEW.status || '.',
      '/prize-shop'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_redemption_status_notify
  AFTER UPDATE ON public.prize_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_redemption_status_change();

-- Trigger function: notify all users when a new challenge is created
CREATE OR REPLACE FUNCTION public.notify_new_challenge()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_active = true THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT
      p.user_id,
      'info',
      'New Challenge Available',
      'A new challenge "' || NEW.name || '" is now available! Earn ' || NEW.points_reward || ' points.',
      '/challenges'
    FROM public.profiles p;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_challenge_notify
  AFTER INSERT ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_challenge();