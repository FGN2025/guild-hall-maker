CREATE POLICY "Tenant admins upload tenant logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'app-media'
  AND (storage.foldername(name))[1] = 'tenant-logos'
  AND public.is_tenant_admin_or_manager(
    (NULLIF(split_part(split_part(name, '/', 2), '.', 1), ''))::uuid,
    auth.uid()
  )
);

CREATE POLICY "Tenant admins update tenant logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'app-media'
  AND (storage.foldername(name))[1] = 'tenant-logos'
  AND public.is_tenant_admin_or_manager(
    (NULLIF(split_part(split_part(name, '/', 2), '.', 1), ''))::uuid,
    auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'app-media'
  AND (storage.foldername(name))[1] = 'tenant-logos'
  AND public.is_tenant_admin_or_manager(
    (NULLIF(split_part(split_part(name, '/', 2), '.', 1), ''))::uuid,
    auth.uid()
  )
);