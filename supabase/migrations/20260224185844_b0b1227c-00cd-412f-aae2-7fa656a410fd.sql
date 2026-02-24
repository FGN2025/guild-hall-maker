
-- Create a SECURITY DEFINER function to check tenant admin role without triggering RLS
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_admins
    WHERE tenant_id = _tenant_id AND user_id = _user_id AND role = 'admin'
  )
$$;

-- Create a helper to check if user belongs to a tenant (any role)
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_admins
    WHERE tenant_id = _tenant_id AND user_id = _user_id
  )
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Tenant admins can manage their team" ON public.tenant_admins;

-- Recreate without recursion using the SECURITY DEFINER function
CREATE POLICY "Tenant admins can manage their team"
ON public.tenant_admins
FOR ALL
USING (is_tenant_admin(tenant_id, auth.uid()))
WITH CHECK (is_tenant_admin(tenant_id, auth.uid()));

-- Also fix tenant_integrations policy that references tenant_admins
DROP POLICY IF EXISTS "Tenant admins can manage their integrations" ON public.tenant_integrations;
CREATE POLICY "Tenant admins can manage their integrations"
ON public.tenant_integrations
FOR ALL
USING (is_tenant_member(tenant_id, auth.uid()))
WITH CHECK (is_tenant_member(tenant_id, auth.uid()));

-- Fix tenant_subscribers policy
DROP POLICY IF EXISTS "Tenant admins can manage their subscribers" ON public.tenant_subscribers;
CREATE POLICY "Tenant admins can manage their subscribers"
ON public.tenant_subscribers
FOR ALL
USING (is_tenant_member(tenant_id, auth.uid()))
WITH CHECK (is_tenant_member(tenant_id, auth.uid()));

-- Fix tenant_zip_codes policy
DROP POLICY IF EXISTS "Tenant admins can manage their zips" ON public.tenant_zip_codes;
CREATE POLICY "Tenant admins can manage their zips"
ON public.tenant_zip_codes
FOR ALL
USING (is_tenant_member(tenant_id, auth.uid()))
WITH CHECK (is_tenant_member(tenant_id, auth.uid()));

-- Fix user_service_interests policies
DROP POLICY IF EXISTS "Tenant admins can view their leads" ON public.user_service_interests;
CREATE POLICY "Tenant admins can view their leads"
ON public.user_service_interests
FOR SELECT
USING (is_tenant_member(tenant_id, auth.uid()));

DROP POLICY IF EXISTS "Tenant admins can update lead status" ON public.user_service_interests;
CREATE POLICY "Tenant admins can update lead status"
ON public.user_service_interests
FOR UPDATE
USING (is_tenant_member(tenant_id, auth.uid()))
WITH CHECK (is_tenant_member(tenant_id, auth.uid()));
