
-- tenant_subscribers: widen admin-only policies to admin + manager
DROP POLICY IF EXISTS "Tenant admins can select subscribers" ON public.tenant_subscribers;
DROP POLICY IF EXISTS "Tenant admins can insert subscribers" ON public.tenant_subscribers;
DROP POLICY IF EXISTS "Tenant admins can update subscribers" ON public.tenant_subscribers;
DROP POLICY IF EXISTS "Tenant admins can delete subscribers" ON public.tenant_subscribers;

CREATE POLICY "Tenant admins and managers can select subscribers"
ON public.tenant_subscribers FOR SELECT TO authenticated
USING (public.is_tenant_admin_or_manager(tenant_id, auth.uid()));

CREATE POLICY "Tenant admins and managers can insert subscribers"
ON public.tenant_subscribers FOR INSERT TO authenticated
WITH CHECK (public.is_tenant_admin_or_manager(tenant_id, auth.uid()));

CREATE POLICY "Tenant admins and managers can update subscribers"
ON public.tenant_subscribers FOR UPDATE TO authenticated
USING (public.is_tenant_admin_or_manager(tenant_id, auth.uid()))
WITH CHECK (public.is_tenant_admin_or_manager(tenant_id, auth.uid()));

CREATE POLICY "Tenant admins and managers can delete subscribers"
ON public.tenant_subscribers FOR DELETE TO authenticated
USING (public.is_tenant_admin_or_manager(tenant_id, auth.uid()));

-- tenant_integrations: widen admin-only policies to admin + manager
DROP POLICY IF EXISTS "Tenant admins can insert integrations" ON public.tenant_integrations;
DROP POLICY IF EXISTS "Tenant admins can update integrations" ON public.tenant_integrations;
DROP POLICY IF EXISTS "Tenant admins can delete integrations" ON public.tenant_integrations;

CREATE POLICY "Tenant admins and managers can insert integrations"
ON public.tenant_integrations FOR INSERT TO authenticated
WITH CHECK (public.is_tenant_admin_or_manager(tenant_id, auth.uid()));

CREATE POLICY "Tenant admins and managers can update integrations"
ON public.tenant_integrations FOR UPDATE TO authenticated
USING (public.is_tenant_admin_or_manager(tenant_id, auth.uid()))
WITH CHECK (public.is_tenant_admin_or_manager(tenant_id, auth.uid()));

CREATE POLICY "Tenant admins and managers can delete integrations"
ON public.tenant_integrations FOR DELETE TO authenticated
USING (public.is_tenant_admin_or_manager(tenant_id, auth.uid()));
