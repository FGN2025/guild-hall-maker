-- 1) One-shot backfill --------------------------------------------------

-- Pattern B: legacy users with a matched account
INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
SELECT lu.matched_user_id, lu.tenant_id, lu.zip_code, 'legacy'
FROM public.legacy_users lu
WHERE lu.matched_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Pattern A: profile ZIP maps to a tenant
INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
SELECT DISTINCT p.user_id, tz.tenant_id, p.zip_code, 'new'
FROM public.profiles p
JOIN public.tenant_zip_codes tz ON tz.zip_code = p.zip_code
WHERE p.zip_code IS NOT NULL AND length(trim(p.zip_code)) = 5
ON CONFLICT DO NOTHING;

-- Pattern C: FGN-fallback user whose ZIP now maps to a real tenant
INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
SELECT DISTINCT usi.user_id, tz.tenant_id, p.zip_code, 'new'
FROM public.user_service_interests usi
JOIN public.profiles p ON p.user_id = usi.user_id
JOIN public.tenant_zip_codes tz ON tz.zip_code = p.zip_code
WHERE usi.tenant_id = 'd12d8519-4f30-4d98-9069-e614ee593f98'
  AND tz.tenant_id <> 'd12d8519-4f30-4d98-9069-e614ee593f98'
ON CONFLICT DO NOTHING;


-- 2) Harden handle_new_user to auto-route by ZIP ------------------------

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

  -- ZIP-based auto-route: covers OAuth, magic-link, embed, and any path
  -- that didn't pass selected_tenant_id / provider_tenant_ids.
  IF _zip IS NOT NULL THEN
    FOR _tid IN
      SELECT DISTINCT tz.tenant_id
      FROM public.tenant_zip_codes tz
      JOIN public.tenants t ON t.id = tz.tenant_id AND t.status = 'active'
      WHERE tz.zip_code = _zip
    LOOP
      INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
      VALUES (NEW.id, _tid, _zip, 'new')
      ON CONFLICT DO NOTHING;
      _inserted_count := _inserted_count + 1;
    END LOOP;
  END IF;

  -- FGN fallback only when nothing else matched
  IF _inserted_count = 0 THEN
    INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
    VALUES (NEW.id, _fgn_id, _zip, 'new')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;


-- 3) Admin re-scan RPC --------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_resync_tenant_registrations()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _a int := 0;
  _b int := 0;
  _c int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  WITH ins AS (
    INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
    SELECT lu.matched_user_id, lu.tenant_id, lu.zip_code, 'legacy'
    FROM public.legacy_users lu
    WHERE lu.matched_user_id IS NOT NULL
    ON CONFLICT DO NOTHING
    RETURNING 1
  ) SELECT COUNT(*) INTO _b FROM ins;

  WITH ins AS (
    INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
    SELECT DISTINCT p.user_id, tz.tenant_id, p.zip_code, 'new'
    FROM public.profiles p
    JOIN public.tenant_zip_codes tz ON tz.zip_code = p.zip_code
    WHERE p.zip_code IS NOT NULL AND length(trim(p.zip_code)) = 5
    ON CONFLICT DO NOTHING
    RETURNING 1
  ) SELECT COUNT(*) INTO _a FROM ins;

  WITH ins AS (
    INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status)
    SELECT DISTINCT usi.user_id, tz.tenant_id, p.zip_code, 'new'
    FROM public.user_service_interests usi
    JOIN public.profiles p ON p.user_id = usi.user_id
    JOIN public.tenant_zip_codes tz ON tz.zip_code = p.zip_code
    WHERE usi.tenant_id = 'd12d8519-4f30-4d98-9069-e614ee593f98'
      AND tz.tenant_id <> 'd12d8519-4f30-4d98-9069-e614ee593f98'
    ON CONFLICT DO NOTHING
    RETURNING 1
  ) SELECT COUNT(*) INTO _c FROM ins;

  RETURN jsonb_build_object('pattern_a', _a, 'pattern_b', _b, 'pattern_c', _c);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_resync_tenant_registrations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resync_tenant_registrations() TO authenticated, service_role;