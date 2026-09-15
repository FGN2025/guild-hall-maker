-- Harden social_connections OAuth token exposure
-- 1) Tokens must never be readable or writable by client roles
REVOKE ALL (access_token, refresh_token) ON public.social_connections FROM authenticated, anon;

-- 2) Remove broad table-level write privileges from client roles and re-grant
--    only on non-secret columns (clients never write tokens; OAuth callbacks
--    and publishers run with service_role).
REVOKE INSERT, UPDATE ON public.social_connections FROM authenticated, anon;
GRANT UPDATE (account_name, page_id, is_active, updated_at)
  ON public.social_connections TO authenticated;
GRANT INSERT (tenant_id, user_id, platform, account_name, page_id, is_active)
  ON public.social_connections TO authenticated;

-- 3) Keep row visibility for management, but scope token-bearing rows:
--    tenant managers/admins can see connection metadata only (token columns are
--    not granted to them at all), owners keep full self-service access.
DROP POLICY IF EXISTS "Owners and admins can read social connection metadata" ON public.social_connections;
CREATE POLICY "Owners and admins can read social connection metadata"
  ON public.social_connections
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_tenant_admin_or_manager(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 4) Service role retains full access for edge functions
GRANT ALL ON public.social_connections TO service_role;