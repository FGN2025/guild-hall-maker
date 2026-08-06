-- 1. social_connections: hide tokens from the Data API entirely
REVOKE SELECT ON public.social_connections FROM anon, authenticated;
GRANT SELECT (id, tenant_id, user_id, platform, account_name, page_id, token_expires_at, is_active, created_at, updated_at)
  ON public.social_connections TO authenticated;
GRANT ALL ON public.social_connections TO service_role;

-- 2. tenant_event_registrations: restrict to tenant admins/managers
DROP POLICY IF EXISTS "Tenant members can view event registrations" ON public.tenant_event_registrations;
CREATE POLICY "Tenant admins can view event registrations"
ON public.tenant_event_registrations
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenant_events te
  WHERE te.id = tenant_event_registrations.event_id
    AND public.is_tenant_admin_or_manager(te.tenant_id, auth.uid())
));

-- 3. tournament_registrations: remove co-participant visibility, hide invite codes
DROP POLICY IF EXISTS "Co-participants can view registrations" ON public.tournament_registrations;

REVOKE SELECT ON public.tournament_registrations FROM anon, authenticated;
GRANT SELECT (id, tournament_id, user_id, registered_at, status, attended, checked_in_at, checked_in_by, participation_tier)
  ON public.tournament_registrations TO authenticated;
GRANT ALL ON public.tournament_registrations TO service_role;

-- counts-only helper so capacity/full state still works without exposing identities
CREATE OR REPLACE FUNCTION public.get_tournament_registration_counts(_tournament_ids uuid[])
RETURNS TABLE(tournament_id uuid, registration_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tr.tournament_id, count(*)::bigint
  FROM public.tournament_registrations tr
  WHERE tr.tournament_id = ANY(_tournament_ids)
  GROUP BY tr.tournament_id
$$;

GRANT EXECUTE ON FUNCTION public.get_tournament_registration_counts(uuid[]) TO anon, authenticated, service_role;