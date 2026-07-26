
-- 1. Dedupe Darcy's facebook rows on Acme: keep the most recent, delete the rest
DELETE FROM public.social_connections
WHERE user_id = '84d2999e-0eae-4a52-b508-a0aafc6c84d7'
  AND platform = 'facebook'
  AND tenant_id = '41a2e493-079a-4a17-a3a9-aebdd5fe5f81'
  AND id <> '5a5bc913-1469-438c-9e95-176ccf3746a4';

-- 2. Enforce tenant_id NOT NULL going forward (no orphaned rows should exist)
ALTER TABLE public.social_connections ALTER COLUMN tenant_id SET NOT NULL;

-- 3. Grants for base table and safe view (previously only sandbox_exec had access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_connections TO authenticated;
GRANT ALL ON public.social_connections TO service_role;
GRANT SELECT ON public.social_connections_safe TO authenticated;
GRANT ALL ON public.social_connections_safe TO service_role;

-- 4. Add missing SELECT policy: owner or tenant admin/manager may read.
--    (Only INSERT/UPDATE/DELETE policies existed, so no one could read.)
DROP POLICY IF EXISTS "Users and tenant admins can read social connections" ON public.social_connections;
CREATE POLICY "Users and tenant admins can read social connections"
  ON public.social_connections
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_tenant_admin_or_manager(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 5. Ensure the safe view runs as invoker so RLS above applies to view reads
ALTER VIEW public.social_connections_safe SET (security_invoker = on);
