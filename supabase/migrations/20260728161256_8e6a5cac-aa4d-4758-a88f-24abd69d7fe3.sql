
CREATE POLICY "Tenant admins and managers can select integrations"
ON public.tenant_integrations FOR SELECT TO authenticated
USING (public.is_tenant_admin_or_manager(tenant_id, auth.uid()));

CREATE POLICY "Platform admins can select all integrations"
ON public.tenant_integrations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
