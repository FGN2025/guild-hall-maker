
-- 1) tenant_zip_codes: scope SELECT to tenant members + admins
DROP POLICY IF EXISTS "Authenticated can view tenant zips" ON public.tenant_zip_codes;
CREATE POLICY "Tenant members can view tenant zips"
  ON public.tenant_zip_codes FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- 2) tournament_registrations.invite_code: hide from non-privileged readers via column-level privileges.
-- Owners/tenant admins access invite_code via server-side RPCs (get_tenant_lead_players / service_role).
REVOKE SELECT (invite_code) ON public.tournament_registrations FROM authenticated, anon;
GRANT SELECT (invite_code) ON public.tournament_registrations TO service_role;
