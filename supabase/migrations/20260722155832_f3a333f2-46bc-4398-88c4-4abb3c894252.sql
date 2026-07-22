
-- Helper: admin or manager (excludes marketing)
CREATE OR REPLACE FUNCTION public.is_tenant_admin_or_manager(_tenant_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_admins
    WHERE tenant_id = _tenant_id
      AND user_id = _user_id
      AND role IN ('admin','manager')
  )
$$;

-- tenant_zip_codes: restrict writes to admin/manager (was is_tenant_member which included marketing)
DROP POLICY IF EXISTS "Tenant admins can manage their zips" ON public.tenant_zip_codes;
CREATE POLICY "Tenant admins can manage their zips"
  ON public.tenant_zip_codes FOR ALL
  USING (public.is_tenant_admin_or_manager(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_admin_or_manager(tenant_id, auth.uid()));

-- user_service_interests: restrict lead UPDATE/DELETE to admin/manager
DROP POLICY IF EXISTS "Tenant admins can update lead status" ON public.user_service_interests;
CREATE POLICY "Tenant admins can update lead status"
  ON public.user_service_interests FOR UPDATE
  USING (public.is_tenant_admin_or_manager(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_admin_or_manager(tenant_id, auth.uid()));

DROP POLICY IF EXISTS "Tenant admins can delete their leads" ON public.user_service_interests;
CREATE POLICY "Tenant admins can delete their leads"
  ON public.user_service_interests FOR DELETE
  USING (public.is_tenant_admin_or_manager(tenant_id, auth.uid()));
