-- Allow NULL zip_code on user_service_interests so users can be linked to a tenant
-- even when no ZIP was entered (tenant-branded landing page or invite code).
ALTER TABLE public.user_service_interests ALTER COLUMN zip_code DROP NOT NULL;

-- Update handle_new_user: when a selected_tenant_id is present, link the user to
-- that tenant regardless of whether they provided a ZIP. FGN fallback unchanged.
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
  _inserted_count int := 0;
  _fgn_id constant uuid := 'd12d8519-4f30-4d98-9069-e614ee593f98';
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

  IF _selected_tenant IS NOT NULL THEN
    INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
    VALUES (NEW.id, _selected_tenant, _zip, 'new')
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS _inserted_count = ROW_COUNT;
  ELSE
    _provider_ids := NEW.raw_user_meta_data->'provider_tenant_ids';
    IF jsonb_typeof(_provider_ids) = 'array' THEN
      FOR _tid IN SELECT (value #>> '{}')::uuid FROM jsonb_array_elements(_provider_ids) LOOP
        INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
        VALUES (NEW.id, _tid, _zip, 'new')
        ON CONFLICT DO NOTHING;
        _inserted_count := _inserted_count + 1;
      END LOOP;
    END IF;
  END IF;

  -- Fallback: if no tenant association was created, add the user to the FGN cohort.
  IF _inserted_count = 0 THEN
    INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
    VALUES (NEW.id, _fgn_id, _zip, 'new')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;