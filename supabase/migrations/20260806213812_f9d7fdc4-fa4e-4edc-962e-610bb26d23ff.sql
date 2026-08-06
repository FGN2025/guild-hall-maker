-- Step 1a: exact counts -> platform roles only
REVOKE EXECUTE ON FUNCTION public.get_tournament_registration_counts(uuid[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_tournament_registration_counts(_tournament_ids uuid[])
RETURNS TABLE(tournament_id uuid, registration_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT tr.tournament_id, count(*)::bigint
  FROM public.tournament_registrations tr
  WHERE tr.tournament_id = ANY(_tournament_ids)
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'moderator'::app_role))
  GROUP BY tr.tournament_id
$function$;

GRANT EXECUTE ON FUNCTION public.get_tournament_registration_counts(uuid[]) TO authenticated, service_role;

-- Step 1b: capacity-only function, callable by everyone, no integer count crosses the boundary
CREATE OR REPLACE FUNCTION public.get_tournament_capacity(_tournament_ids uuid[])
RETURNS TABLE(tournament_id uuid, max_participants integer, is_full boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT t.id,
         t.max_participants,
         (SELECT count(*) FROM public.tournament_registrations tr
           WHERE tr.tournament_id = t.id) >= t.max_participants AS is_full
  FROM public.tournaments t
  WHERE t.id = ANY(_tournament_ids)
$function$;

GRANT EXECUTE ON FUNCTION public.get_tournament_capacity(uuid[]) TO anon, authenticated, service_role;

-- Step 2: cross-tenant visibility helper (works for plain members, not just tenant admins)
CREATE OR REPLACE FUNCTION public.shares_any_tenant(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH v AS (
    SELECT tenant_id FROM public.user_service_interests WHERE user_id = _viewer AND tenant_id IS NOT NULL
    UNION SELECT tenant_id FROM public.tenant_subscribers WHERE user_id = _viewer AND tenant_id IS NOT NULL
    UNION SELECT tenant_id FROM public.tenant_admins WHERE user_id = _viewer AND tenant_id IS NOT NULL
  ), t AS (
    SELECT tenant_id FROM public.user_service_interests WHERE user_id = _target AND tenant_id IS NOT NULL
    UNION SELECT tenant_id FROM public.tenant_subscribers WHERE user_id = _target AND tenant_id IS NOT NULL
    UNION SELECT tenant_id FROM public.tenant_admins WHERE user_id = _target AND tenant_id IS NOT NULL
  )
  SELECT _viewer IS NOT NULL AND EXISTS (SELECT 1 FROM v JOIN t ON t.tenant_id = v.tenant_id)
$function$;

REVOKE EXECUTE ON FUNCTION public.shares_any_tenant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_any_tenant(uuid, uuid) TO authenticated, service_role;

-- season_snapshots
DROP POLICY IF EXISTS "Authenticated users can view snapshots" ON public.season_snapshots;
CREATE POLICY "Snapshots visible to self, same tenant, staff"
ON public.season_snapshots FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.shares_any_tenant(auth.uid(), user_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);
REVOKE ALL ON public.season_snapshots FROM anon;

-- season_scores
DROP POLICY IF EXISTS "Authenticated users can view season scores" ON public.season_scores;
CREATE POLICY "Season scores visible to self, same tenant, staff"
ON public.season_scores FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.shares_any_tenant(auth.uid(), user_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);
REVOKE ALL ON public.season_scores FROM anon;

-- tournament_placements
DROP POLICY IF EXISTS "Placements viewable by authenticated" ON public.tournament_placements;
CREATE POLICY "Placements visible to self, same tenant, staff"
ON public.tournament_placements FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.shares_any_tenant(auth.uid(), user_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);
REVOKE ALL ON public.tournament_placements FROM anon;