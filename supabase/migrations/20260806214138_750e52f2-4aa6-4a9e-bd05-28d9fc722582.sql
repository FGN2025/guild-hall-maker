CREATE OR REPLACE FUNCTION public.shares_any_tenant(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH plat AS (SELECT 'd12d8519-4f30-4d98-9069-e614ee593f98'::uuid AS id),
  v AS (
    SELECT tenant_id FROM public.user_service_interests WHERE user_id = _viewer AND tenant_id IS NOT NULL
    UNION SELECT tenant_id FROM public.tenant_subscribers WHERE user_id = _viewer AND tenant_id IS NOT NULL
    UNION SELECT tenant_id FROM public.tenant_admins WHERE user_id = _viewer AND tenant_id IS NOT NULL
  ), t AS (
    SELECT tenant_id FROM public.user_service_interests WHERE user_id = _target AND tenant_id IS NOT NULL
    UNION SELECT tenant_id FROM public.tenant_subscribers WHERE user_id = _target AND tenant_id IS NOT NULL
    UNION SELECT tenant_id FROM public.tenant_admins WHERE user_id = _target AND tenant_id IS NOT NULL
  )
  SELECT _viewer IS NOT NULL AND EXISTS (
    SELECT 1 FROM v JOIN t ON t.tenant_id = v.tenant_id
    WHERE v.tenant_id <> (SELECT id FROM plat)
  )
$function$;