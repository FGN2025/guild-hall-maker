
CREATE OR REPLACE FUNCTION public.claim_pending_invitations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _inv RECORD;
  _email TEXT;
  _tenant_name TEXT;
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  IF _email IS NULL THEN RETURN; END IF;

  FOR _inv IN
    SELECT * FROM public.tenant_invitations
    WHERE lower(email) = lower(_email) AND claimed_at IS NULL
  LOOP
    INSERT INTO public.tenant_admins (tenant_id, user_id, role)
    VALUES (_inv.tenant_id, _uid, _inv.role)
    ON CONFLICT DO NOTHING;
    UPDATE public.tenant_invitations SET claimed_at = now() WHERE id = _inv.id;

    SELECT name INTO _tenant_name FROM public.tenants WHERE id = _inv.tenant_id;
    PERFORM net.http_post(
      url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-invite-welcome',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
      body := jsonb_build_object('email', _email, 'tenantName', COALESCE(_tenant_name, 'your organization'), 'role', _inv.role)
    );
  END LOOP;
END;
$$;
