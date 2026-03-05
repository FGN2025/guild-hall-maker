
CREATE POLICY "Marketing role can manage campaigns"
  ON public.marketing_campaigns FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'marketing'))
  WITH CHECK (public.has_role(auth.uid(), 'marketing'));

CREATE POLICY "Marketing role can manage marketing assets"
  ON public.marketing_assets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'marketing'))
  WITH CHECK (public.has_role(auth.uid(), 'marketing'));
