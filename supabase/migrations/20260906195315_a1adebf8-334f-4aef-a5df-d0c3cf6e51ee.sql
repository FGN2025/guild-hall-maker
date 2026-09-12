-- Ensure raw OAuth secrets are never readable through the client API.
REVOKE SELECT ON public.social_connections FROM authenticated, anon;

GRANT SELECT (id, tenant_id, user_id, platform, account_name, page_id, is_active, token_expires_at, created_at, updated_at)
  ON public.social_connections TO authenticated;

GRANT ALL ON public.social_connections TO service_role;

-- Tighten the read policy: owners and admins may see connection metadata only
-- (token columns are excluded by the column-level grant above).
DROP POLICY IF EXISTS "Users and tenant admins can read social connections" ON public.social_connections;
CREATE POLICY "Owners and admins can read social connection metadata"
  ON public.social_connections FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_tenant_admin_or_manager(tenant_id, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
