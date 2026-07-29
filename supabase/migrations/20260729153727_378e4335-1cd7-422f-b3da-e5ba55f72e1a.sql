CREATE OR REPLACE FUNCTION public.is_tournament_participant(_tournament_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = _tournament_id
      AND user_id = _user_id
  )
$$;

REVOKE ALL ON FUNCTION public.is_tournament_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_tournament_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tournament_participant(uuid, uuid) TO service_role;

DROP POLICY IF EXISTS "Co-participants can view registrations" ON public.tournament_registrations;

CREATE POLICY "Co-participants can view registrations"
ON public.tournament_registrations
FOR SELECT
TO authenticated
USING (public.is_tournament_participant(tournament_id, auth.uid()));