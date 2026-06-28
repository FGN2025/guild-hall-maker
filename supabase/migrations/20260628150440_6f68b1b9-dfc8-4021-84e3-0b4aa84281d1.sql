-- Make admin-only SELECT explicit on discord_channel_webhooks (already covered by ALL policy, but adds clarity)
CREATE POLICY "Only admins can read discord webhooks"
  ON public.discord_channel_webhooks
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));