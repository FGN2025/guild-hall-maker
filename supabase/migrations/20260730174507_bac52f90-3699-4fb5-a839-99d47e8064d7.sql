CREATE POLICY "Admins can update registrations"
ON public.tournament_registrations FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tournament creators can update registrations"
ON public.tournament_registrations FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_registrations.tournament_id AND t.created_by = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_registrations.tournament_id AND t.created_by = auth.uid()));