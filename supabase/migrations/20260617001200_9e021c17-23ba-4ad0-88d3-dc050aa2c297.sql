DROP POLICY IF EXISTS "Anyone can view likes" ON public.community_likes;
CREATE POLICY "Authenticated can view likes"
  ON public.community_likes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role can read ecosystem webhooks" ON public.ecosystem_webhooks;
CREATE POLICY "Service role can read ecosystem webhooks"
  ON public.ecosystem_webhooks
  FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "app-media owners or staff can update" ON storage.objects;
CREATE POLICY "app-media owners or staff can update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'app-media'
    AND (
      (owner_id)::text = (auth.uid())::text
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'moderator'::app_role)
    )
  );