DROP FUNCTION IF EXISTS public.lookup_providers_by_zip(text);

CREATE OR REPLACE FUNCTION public.lookup_providers_by_zip(_zip text)
 RETURNS TABLE(tenant_id uuid, tenant_name text, tenant_slug text, logo_url text, city text, state text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.id, t.name, t.slug, t.logo_url, tz.city, tz.state
  FROM tenant_zip_codes tz
  JOIN tenants t ON t.id = tz.tenant_id
  WHERE tz.zip_code = _zip AND t.status = 'active';
$function$;