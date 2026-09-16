
-- Ensure no broad table-level SELECT/INSERT/UPDATE to clients
REVOKE SELECT, INSERT, UPDATE ON public.social_connections FROM authenticated;
REVOKE ALL ON public.social_connections FROM anon;

-- Column-scoped SELECT: tokens intentionally excluded
GRANT SELECT (id, tenant_id, user_id, platform, account_name, page_id,
              is_active, token_expires_at, created_at, updated_at,
              token_checked_at, token_check_error)
  ON public.social_connections TO authenticated;

-- Owners may create a connection (tokens are write-only from the client)
GRANT INSERT (tenant_id, user_id, platform, account_name, page_id,
              access_token, refresh_token, token_expires_at, is_active)
  ON public.social_connections TO authenticated;

-- Owners may update their own connection fields, including rotating tokens
GRANT UPDATE (account_name, page_id, access_token, refresh_token,
              token_expires_at, is_active)
  ON public.social_connections TO authenticated;

GRANT ALL ON public.social_connections TO service_role;

-- Tighten the read policy: metadata visible to owner / tenant staff / platform admins,
-- but token columns are no longer selectable by any client role.
DROP POLICY IF EXISTS "Owners and admins can read social connection metadata" ON public.social_connections;
CREATE POLICY "Owners and admins can read social connection metadata"
  ON public.social_connections FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_tenant_admin_or_manager(tenant_id, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
