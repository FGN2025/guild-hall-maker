ALTER TABLE public.tenant_sync_logs DROP CONSTRAINT tenant_sync_logs_tenant_id_fkey,
  ADD CONSTRAINT tenant_sync_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.legacy_users DROP CONSTRAINT legacy_users_tenant_id_fkey,
  ADD CONSTRAINT legacy_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;