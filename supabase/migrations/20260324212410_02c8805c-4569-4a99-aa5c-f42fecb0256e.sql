-- Allow tenant admins to UPDATE/DELETE their own legacy_users
CREATE POLICY "Tenant admins can update own legacy users"
ON public.legacy_users
FOR UPDATE
TO authenticated
USING (is_tenant_admin(tenant_id, auth.uid()))
WITH CHECK (is_tenant_admin(tenant_id, auth.uid()));

CREATE POLICY "Tenant admins can delete own legacy users"
ON public.legacy_users
FOR DELETE
TO authenticated
USING (is_tenant_admin(tenant_id, auth.uid()));

-- Allow tenant admins to insert bans
CREATE POLICY "Tenant admins can insert bans"
ON public.banned_users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_admins
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);