-- 1) season_snapshots: remove anonymous read access
DROP POLICY IF EXISTS "Anyone can view snapshots" ON public.season_snapshots;
CREATE POLICY "Authenticated users can view snapshots"
ON public.season_snapshots
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.season_snapshots FROM anon;
GRANT SELECT ON public.season_snapshots TO authenticated;
GRANT ALL ON public.season_snapshots TO service_role;

-- 2) tenants: hide contact_email from anonymous visitors via column-level grants
REVOKE SELECT ON public.tenants FROM anon;
GRANT SELECT (
  id, name, slug, logo_url, status, created_at, updated_at,
  primary_color, accent_color, require_subscriber_validation,
  onboarding_completed, timezone, plan_tier, marketing_seed_density
) ON public.tenants TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;