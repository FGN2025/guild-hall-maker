CREATE OR REPLACE FUNCTION public.validate_tenant_code(_code text, _tenant_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _record RECORD;
BEGIN
  -- Find the code, optionally scoped to a tenant
  IF _tenant_id IS NOT NULL THEN
    SELECT * INTO _record FROM public.tenant_codes
    WHERE code = upper(trim(_code)) AND tenant_id = _tenant_id AND is_active = true
    FOR UPDATE;
  ELSE
    SELECT * INTO _record FROM public.tenant_codes
    WHERE code = upper(trim(_code)) AND is_active = true
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Code not found or inactive');
  END IF;

  -- Check expiry
  IF _record.expires_at IS NOT NULL AND _record.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Code has expired');
  END IF;

  -- Check usage limit
  IF _record.max_uses IS NOT NULL AND _record.times_used >= _record.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Code has reached maximum uses');
  END IF;

  -- Increment usage
  UPDATE public.tenant_codes SET times_used = times_used + 1 WHERE id = _record.id;

  RETURN jsonb_build_object(
    'valid', true,
    'code_id', _record.id,
    'code_type', _record.code_type,
    'tenant_id', _record.tenant_id,
    'campaign_id', _record.campaign_id,
    'description', _record.description
  );
END;
$$;