-- Replace the overly permissive INSERT policy with one that only allows authenticated inserts for own user_id
DROP POLICY "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);