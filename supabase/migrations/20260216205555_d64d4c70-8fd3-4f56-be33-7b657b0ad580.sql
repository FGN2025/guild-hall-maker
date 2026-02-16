-- Item 9: Allow admins to manage seasons
CREATE POLICY "Admins can manage seasons"
  ON public.seasons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));