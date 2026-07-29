CREATE POLICY "Tenant managers write tenant-marketing"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tenant-marketing'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_tenant_admin_or_manager((NULLIF(split_part(name, '/', 1), ''))::uuid, auth.uid())
  )
);

CREATE POLICY "Tenant managers update tenant-marketing"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'tenant-marketing'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_tenant_admin_or_manager((NULLIF(split_part(name, '/', 1), ''))::uuid, auth.uid())
  )
);

CREATE POLICY "Tenant managers delete tenant-marketing"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tenant-marketing'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_tenant_admin_or_manager((NULLIF(split_part(name, '/', 1), ''))::uuid, auth.uid())
  )
);

CREATE POLICY "Platform admins read tenant-marketing"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tenant-marketing' AND public.has_role(auth.uid(), 'admin'));