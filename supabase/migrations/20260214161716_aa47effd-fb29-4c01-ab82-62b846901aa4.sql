
-- Allow tenant admins to view leads for their tenant
CREATE POLICY "Tenant admins can view their leads" ON public.user_service_interests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_admins ta
      WHERE ta.tenant_id = user_service_interests.tenant_id
      AND ta.user_id = auth.uid()
    )
  );

-- Allow tenant admins to manage their own tenant's ZIP codes
CREATE POLICY "Tenant admins can manage their zips" ON public.tenant_zip_codes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_admins ta
      WHERE ta.tenant_id = tenant_zip_codes.tenant_id
      AND ta.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_admins ta
      WHERE ta.tenant_id = tenant_zip_codes.tenant_id
      AND ta.user_id = auth.uid()
    )
  );
