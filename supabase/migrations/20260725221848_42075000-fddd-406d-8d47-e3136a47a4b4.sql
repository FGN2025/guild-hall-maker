
-- =========================================================
-- 1) TENANTS: display-only view for anonymous browsing
-- =========================================================
CREATE OR REPLACE VIEW public.tenants_public
WITH (security_invoker=on) AS
  SELECT
    id, name, slug, logo_url, status,
    primary_color, accent_color, timezone,
    require_subscriber_validation, onboarding_completed,
    plan_tier, created_at, updated_at
  FROM public.tenants;

GRANT SELECT ON public.tenants_public TO anon, authenticated;

-- Reassert column-level lockdown on the base table (idempotent).
REVOKE SELECT ON public.tenants FROM anon;
GRANT SELECT (
  id, name, slug, logo_url, status,
  primary_color, accent_color,
  require_subscriber_validation, onboarding_completed,
  timezone, plan_tier, created_at, updated_at
) ON public.tenants TO anon;

-- =========================================================
-- 2) TOURNAMENT REGISTRATIONS: co-participant projection view
-- =========================================================
CREATE OR REPLACE VIEW public.tournament_registrations_public
WITH (security_invoker=on) AS
  SELECT id, tournament_id, user_id, status, registered_at, attended
  FROM public.tournament_registrations;

GRANT SELECT ON public.tournament_registrations_public TO authenticated;

-- Remove sensitive columns from client-role access on the base table.
REVOKE SELECT (invite_code, checked_in_at, checked_in_by)
  ON public.tournament_registrations FROM PUBLIC;
REVOKE SELECT (invite_code, checked_in_at, checked_in_by)
  ON public.tournament_registrations FROM anon;
REVOKE SELECT (invite_code, checked_in_at, checked_in_by)
  ON public.tournament_registrations FROM authenticated;

GRANT SELECT (invite_code, checked_in_at, checked_in_by)
  ON public.tournament_registrations TO service_role;

-- =========================================================
-- 3) Owner / tournament admin RPC for sensitive fields
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_tournament_registration_private(
  _registration_id uuid
)
RETURNS TABLE(
  id uuid,
  tournament_id uuid,
  user_id uuid,
  invite_code text,
  checked_in_at timestamptz,
  checked_in_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.tournament_id, r.user_id, r.invite_code, r.checked_in_at, r.checked_in_by
  FROM public.tournament_registrations r
  LEFT JOIN public.tournaments t ON t.id = r.tournament_id
  WHERE r.id = _registration_id
    AND (
      r.user_id = auth.uid()
      OR t.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
    );
$$;

REVOKE ALL ON FUNCTION public.get_tournament_registration_private(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_tournament_registration_private(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_tournament_registration_private(uuid) TO authenticated;
