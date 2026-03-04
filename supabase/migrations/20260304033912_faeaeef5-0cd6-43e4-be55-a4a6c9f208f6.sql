CREATE POLICY "Tenant members can view own legacy users"
  ON public.legacy_users FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id, auth.uid()));