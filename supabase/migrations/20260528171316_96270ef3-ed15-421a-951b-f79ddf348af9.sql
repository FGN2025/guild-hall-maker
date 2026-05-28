-- 1) Drop over-permissive tenant-staff SELECT on profiles base table.
--    Tenant code already reads from the safe `profiles_public` view.
DROP POLICY IF EXISTS "Tenant staff can view profiles of tenant members" ON public.profiles;

-- 2) Explicit service-role-only SELECT on ecosystem_auth_tokens.
--    Edge functions use the service role via the admin client; end-user roles must never read tokens.
DROP POLICY IF EXISTS "Service role only can read ecosystem auth tokens" ON public.ecosystem_auth_tokens;
CREATE POLICY "Service role only can read ecosystem auth tokens"
  ON public.ecosystem_auth_tokens
  FOR SELECT
  TO public
  USING (auth.role() = 'service_role');

-- 3) Storage UPDATE policy for app-media bucket.
DROP POLICY IF EXISTS "app-media owners or staff can update" ON storage.objects;
CREATE POLICY "app-media owners or staff can update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'app-media'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
    )
  )
  WITH CHECK (
    bucket_id = 'app-media'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
    )
  );