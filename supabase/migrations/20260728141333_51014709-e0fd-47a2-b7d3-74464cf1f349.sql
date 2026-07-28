CREATE POLICY "Tenant admins delete tenant logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'app-media'
  AND (storage.foldername(name))[1] = 'tenant-logos'
  AND public.is_tenant_admin_or_manager(
    (NULLIF(split_part(split_part(name, '/', 2), '.', 1), ''))::uuid,
    auth.uid()
  )
);