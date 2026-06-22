CREATE OR REPLACE FUNCTION public.get_tenant_zip_overlaps(_tenant_id uuid)
RETURNS TABLE(zip_code text, other_tenant_id uuid, other_tenant_name text, other_tenant_slug text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_tenant_member(_tenant_id, auth.uid())
          OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT tz.zip_code, t.id, t.name, t.slug
  FROM public.tenant_zip_codes tz
  JOIN public.tenants t ON t.id = tz.tenant_id AND t.status = 'active'
  WHERE tz.tenant_id <> _tenant_id
    AND tz.zip_code IN (
      SELECT zip_code FROM public.tenant_zip_codes
       WHERE tenant_id = _tenant_id AND zip_code IS NOT NULL AND zip_code <> ''
    )
  ORDER BY tz.zip_code, t.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_zip_overlaps(uuid) TO authenticated;