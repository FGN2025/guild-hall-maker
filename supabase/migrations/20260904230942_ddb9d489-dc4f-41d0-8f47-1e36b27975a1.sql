CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT tenant_id FROM (
    (SELECT tenant_id, created_at, 1 AS priority
       FROM public.tenant_admins
      WHERE user_id = _user_id)
    UNION ALL
    (SELECT tenant_id, created_at, 2 AS priority
       FROM public.tenant_subscribers
      WHERE user_id = _user_id)
    UNION ALL
    (SELECT tenant_id, created_at, 3 AS priority
       FROM public.user_service_interests
      WHERE user_id = _user_id)
  ) q
  ORDER BY priority ASC, created_at ASC
  LIMIT 1;
$function$;