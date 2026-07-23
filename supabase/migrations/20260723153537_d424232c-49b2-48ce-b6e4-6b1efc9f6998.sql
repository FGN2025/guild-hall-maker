
-- Schema additions
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS requires_invite_code boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invite_code_id uuid REFERENCES public.tenant_codes(id) ON DELETE SET NULL;

ALTER TABLE public.user_service_interests
  ADD COLUMN IF NOT EXISTS invite_code text;

ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS invite_code text;

-- Updated handle_new_user with invite_code support
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
  _invite_code text;
  _invite_tenant uuid;
BEGIN
  _zip := NULLIF(trim(NEW.raw_user_meta_data->>'zip_code'), '');
  _invite_code := NULLIF(trim(NEW.raw_user_meta_data->>'invite_code'), '');

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

  -- Invite code takes priority for tenant routing
  IF _invite_code IS NOT NULL THEN
    SELECT tenant_id INTO _invite_tenant
    FROM public.tenant_codes
    WHERE upper(code) = upper(_invite_code)
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR times_used < max_uses)
    LIMIT 1;

    IF _invite_tenant IS NOT NULL THEN
      INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status, invite_code)
      VALUES (NEW.id, _invite_tenant, _zip, 'new', _invite_code)
      ON CONFLICT (user_id, tenant_id) DO UPDATE
        SET invite_code = COALESCE(public.user_service_interests.invite_code, EXCLUDED.invite_code);
      _inserted_count := _inserted_count + 1;

      UPDATE public.tenant_codes
      SET times_used = times_used + 1
      WHERE upper(code) = upper(_invite_code)
        AND tenant_id = _invite_tenant;
    END IF;
  END IF;

  IF _selected_tenant IS NOT NULL AND _selected_tenant <> COALESCE(_invite_tenant, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status, invite_code)
    VALUES (NEW.id, _selected_tenant, _zip, 'new', _invite_code)
    ON CONFLICT DO NOTHING;
    _inserted_count := _inserted_count + 1;
  ELSIF _selected_tenant IS NULL THEN
    _provider_ids := NEW.raw_user_meta_data->'provider_tenant_ids';
    IF jsonb_typeof(_provider_ids) = 'array' THEN
      FOR _tid IN SELECT (value #>> '{}')::uuid FROM jsonb_array_elements(_provider_ids) LOOP
        INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status, invite_code)
        VALUES (NEW.id, _tid, _zip, 'new', _invite_code)
        ON CONFLICT DO NOTHING;
        _inserted_count := _inserted_count + 1;
      END LOOP;
    END IF;
  END IF;

  -- ZIP-based auto-route
  IF _zip IS NOT NULL THEN
    FOR _tid IN
      SELECT DISTINCT tz.tenant_id
      FROM public.tenant_zip_codes tz
      JOIN public.tenants t ON t.id = tz.tenant_id AND t.status = 'active'
      WHERE tz.zip_code = _zip
    LOOP
      INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status, invite_code)
      VALUES (NEW.id, _tid, _zip, 'new', _invite_code)
      ON CONFLICT DO NOTHING;
      _inserted_count := _inserted_count + 1;
    END LOOP;
  END IF;

  -- FGN fallback
  IF _inserted_count = 0 THEN
    INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status, invite_code)
    VALUES (NEW.id, _fgn_id, _zip, 'new', _invite_code)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill: Fred → NineStar with TOURNEY2026
DO $$
DECLARE
  _fred uuid;
  _ninestar uuid := 'e9c0f4b8-e8e8-45fb-983d-756bd0d3584c';
  _added int := 0;
  _stamped int := 0;
BEGIN
  SELECT id INTO _fred FROM auth.users WHERE lower(email) = 'fred.wells.in@hotmail.com' LIMIT 1;
  IF _fred IS NOT NULL THEN
    INSERT INTO public.user_service_interests (user_id, tenant_id, zip_code, status, invite_code)
    SELECT _fred, _ninestar, (SELECT zip_code FROM public.profiles WHERE user_id = _fred), 'new', 'TOURNEY2026'
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS _added = ROW_COUNT;
  END IF;

  -- Stamp existing NineStar rows for the three players
  UPDATE public.user_service_interests usi
  SET invite_code = 'TOURNEY2026'
  FROM public.profiles p
  WHERE usi.user_id = p.user_id
    AND usi.tenant_id = _ninestar
    AND usi.invite_code IS NULL
    AND p.display_name IN ('Mr.Rosa69', 'kenzoya', 'NoirAngel');
  GET DIAGNOSTICS _stamped = ROW_COUNT;

  UPDATE public.tenant_codes
  SET times_used = times_used + _added + _stamped
  WHERE upper(code) = 'TOURNEY2026' AND tenant_id = _ninestar;
END $$;
