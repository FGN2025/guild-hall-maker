
CREATE POLICY "Admins can view provider inquiries"
  ON public.provider_inquiries
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete provider inquiries"
  ON public.provider_inquiries
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
