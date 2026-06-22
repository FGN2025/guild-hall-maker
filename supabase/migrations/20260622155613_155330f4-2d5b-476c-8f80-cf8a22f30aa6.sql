CREATE OR REPLACE FUNCTION public.get_tenant_lead_players(_tenant_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  zip_code text,
  status text,
  created_at timestamptz,
  display_name text,
  gamer_tag text,
  avatar_url text,
  email text
)
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
  SELECT
    usi.id,
    usi.user_id,
    usi.zip_code,
    usi.status,
    usi.created_at,
    p.display_name,
    p.gamer_tag,
    p.avatar_url,
    u.email::text
  FROM public.user_service_interests usi
  LEFT JOIN public.profiles p ON p.user_id = usi.user_id
  LEFT JOIN auth.users u ON u.id = usi.user_id
  WHERE usi.tenant_id = _tenant_id
  ORDER BY usi.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_lead_players(uuid) TO authenticated;