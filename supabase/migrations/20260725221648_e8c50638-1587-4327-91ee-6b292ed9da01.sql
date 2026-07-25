
-- 1) Tenants: hide contact_email from anonymous visitors via column-level privileges.
--    RLS still allows anon to read active tenants, but only the non-sensitive columns below.
REVOKE SELECT ON public.tenants FROM anon;
GRANT SELECT (
  id, name, slug, logo_url, status,
  primary_color, accent_color,
  require_subscriber_validation, onboarding_completed,
  timezone, plan_tier, created_at, updated_at
) ON public.tenants TO anon;

-- 2) Tournament registrations: revoke sensitive columns from client roles so the
--    "Co-participants can view registrations" policy cannot leak invite codes or
--    check-in metadata. Edge functions using service_role keep full access.
REVOKE SELECT (invite_code, checked_in_at, checked_in_by)
  ON public.tournament_registrations FROM anon, authenticated;

GRANT SELECT (invite_code, checked_in_at, checked_in_by)
  ON public.tournament_registrations TO service_role;
