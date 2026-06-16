
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _zip text;
  _selected_tenant uuid;
  _provider_ids jsonb;
  _tid uuid;
BEGIN
  _zip := NULLIF(trim(NEW.raw_user_meta_data->>'zip_code'), '');

  INSERT INTO public.profiles (user_id, display_name, zip_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    _zip
  )
  ON CONFLICT (user_id) DO UPDATE
    SET zip_code = COALESCE(public.profiles.zip_code, EXCLUDED.zip_code);

  BEGIN
    _selected_tenant := NULLIF(NEW.raw_user_meta_data->>'selected_tenant_id', '')::uuid;
  EXCEPTION WHEN others THEN
    _selected_tenant := NULL;
  END;

  IF _selected_tenant IS NOT NULL AND _zip IS NOT NULL THEN
    INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
    VALUES (NEW.id, _selected_tenant, _zip, 'new')
    ON CONFLICT DO NOTHING;
  ELSIF _zip IS NOT NULL THEN
    _provider_ids := NEW.raw_user_meta_data->'provider_tenant_ids';
    IF jsonb_typeof(_provider_ids) = 'array' THEN
      FOR _tid IN SELECT (value #>> '{}')::uuid FROM jsonb_array_elements(_provider_ids) LOOP
        INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
        VALUES (NEW.id, _tid, _zip, 'new')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
