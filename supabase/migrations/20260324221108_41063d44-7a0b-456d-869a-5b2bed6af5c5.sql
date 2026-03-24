
-- Allow platform admins to insert interest records on behalf of users
CREATE POLICY "Admins can insert interests"
  ON public.user_service_interests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow tenant admins to delete leads for their tenant
CREATE POLICY "Tenant admins can delete their leads"
  ON public.user_service_interests FOR DELETE TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));

-- Allow platform admins to delete any interest record
CREATE POLICY "Admins can delete interests"
  ON public.user_service_interests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
