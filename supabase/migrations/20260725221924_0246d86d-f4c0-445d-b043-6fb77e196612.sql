
-- Column-level REVOKE only wins over a table-level GRANT if the table-level
-- grant is first removed and then re-issued at the column level.
REVOKE SELECT ON public.tournament_registrations FROM anon;
REVOKE SELECT ON public.tournament_registrations FROM authenticated;

GRANT SELECT (id, tournament_id, user_id, registered_at, status, attended)
  ON public.tournament_registrations TO authenticated;

-- Anon has no policies granting row access; do not re-grant column SELECT.

-- Service role keeps unrestricted access via GRANT ALL.
GRANT ALL ON public.tournament_registrations TO service_role;
