-- Read-only membership variant. Deliberately separate from
-- is_tenant_marketing_member (which gates writes) so widening the read path
-- can never widen insert/update/delete.
CREATE OR REPLACE FUNCTION public.is_tenant_marketing_reader(_tenant_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_admins
    WHERE tenant_id = _tenant_id
      AND user_id = _user_id
      AND role IN ('admin', 'marketing', 'manager')
  )
$$;

-- SELECT only, and only for managers; the existing admin/marketing SELECT
-- policy is left exactly as it is.
CREATE POLICY "Tenant managers can view assets"
ON public.tenant_marketing_assets
FOR SELECT
TO authenticated
USING (public.is_tenant_marketing_reader(tenant_id, auth.uid()));