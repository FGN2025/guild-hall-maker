
-- Fix: season_scores_public_select — restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view season scores" ON public.season_scores;
CREATE POLICY "Authenticated users can view season scores"
  ON public.season_scores FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.season_scores FROM anon;

-- Fix: tournament_registrations_broad_select — scope visibility
DROP POLICY IF EXISTS "Authenticated users can view registrations" ON public.tournament_registrations;

CREATE POLICY "Users can view own registration"
  ON public.tournament_registrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Tournament creators can view registrations"
  ON public.tournament_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_registrations.tournament_id
        AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "Co-participants can view registrations"
  ON public.tournament_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_registrations tr2
      WHERE tr2.tournament_id = tournament_registrations.tournament_id
        AND tr2.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all registrations"
  ON public.tournament_registrations FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );

-- Fix: tenant_admins_self_escalation — already using is_tenant_admin (not is_tenant_member),
-- but re-assert the intended policy definition to be explicit and idempotent.
DROP POLICY IF EXISTS "Tenant admins can manage their team" ON public.tenant_admins;
CREATE POLICY "Tenant admins can manage their team"
  ON public.tenant_admins
  FOR ALL
  TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));
