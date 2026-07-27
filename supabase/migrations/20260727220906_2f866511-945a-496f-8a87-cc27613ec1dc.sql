CREATE POLICY "Tenant admins update own tenant"
ON public.tenants
FOR UPDATE
TO authenticated
USING (public.is_tenant_admin_or_manager(id, auth.uid()))
WITH CHECK (public.is_tenant_admin_or_manager(id, auth.uid()));