DROP POLICY IF EXISTS "Admins can manage all integrations" ON public.tenant_integrations;

CREATE POLICY "Admins can insert all integrations" ON public.tenant_integrations
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all integrations" ON public.tenant_integrations
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all integrations" ON public.tenant_integrations
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));