
-- 1. Remove sensitive base-table SELECT policies (safe views already exist and clients use them)
DROP POLICY IF EXISTS "Admins can select ecosystem webhooks meta" ON public.ecosystem_webhooks;
DROP POLICY IF EXISTS "Tenant admins can view purchases" ON public.subscriber_cloud_purchases;
DROP POLICY IF EXISTS "Tenant admins can read integration metadata" ON public.tenant_integrations;
DROP POLICY IF EXISTS "Tenant admins can read subscription status" ON public.tenant_subscriptions;
DROP POLICY IF EXISTS "Platform admins can read all subscriptions" ON public.tenant_subscriptions;

-- 2. Restrict social_connections base SELECT — clients already use social_connections_safe
DROP POLICY IF EXISTS "Owner select via safe view" ON public.social_connections;

-- 3. media_library: stop exposing user_id to anonymous users
DROP POLICY IF EXISTS "Anyone can view media" ON public.media_library;

CREATE POLICY "Authenticated users can view media"
  ON public.media_library
  FOR SELECT
  TO authenticated
  USING (true);

-- Public view excluding user_id for anonymous reads
CREATE OR REPLACE VIEW public.media_library_public
WITH (security_invoker = true) AS
SELECT id, file_name, file_path, file_type, mime_type, file_size, url,
       category, tags, created_at, embed_code
FROM public.media_library;

GRANT SELECT ON public.media_library_public TO anon, authenticated;
