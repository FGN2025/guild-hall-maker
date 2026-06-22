
-- 2.1 Tenant health summary RPC (admin-only)
CREATE OR REPLACE FUNCTION public.get_tenant_health_summary()
RETURNS TABLE(
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
  tenant_status text,
  has_admin boolean,
  admin_count integer,
  zip_count integer,
  lead_count integer,
  subscriber_count integer,
  last_sync_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.slug,
    t.status::text,
    EXISTS(SELECT 1 FROM public.tenant_admins ta WHERE ta.tenant_id = t.id) AS has_admin,
    (SELECT count(*)::int FROM public.tenant_admins ta WHERE ta.tenant_id = t.id) AS admin_count,
    (SELECT count(*)::int FROM public.tenant_zip_codes z WHERE z.tenant_id = t.id) AS zip_count,
    (SELECT count(*)::int FROM public.user_service_interests usi WHERE usi.tenant_id = t.id) AS lead_count,
    (SELECT count(*)::int FROM public.tenant_subscribers ts WHERE ts.tenant_id = t.id) AS subscriber_count,
    (SELECT max(sl.created_at) FROM public.tenant_sync_logs sl WHERE sl.tenant_id = t.id) AS last_sync_at
  FROM public.tenants t
  ORDER BY t.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_tenant_health_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_health_summary() TO authenticated;

-- 2.4 Tighten public provider-inquiry INSERT policy
DROP POLICY IF EXISTS "Anyone can submit a provider inquiry" ON public.provider_inquiries;

CREATE POLICY "Anyone can submit a provider inquiry"
  ON public.provider_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND handled_by IS NULL
    AND handled_at IS NULL
    AND notes IS NULL
  );
