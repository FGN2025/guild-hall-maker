CREATE OR REPLACE FUNCTION public.claim_tenant_invitations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _inv RECORD;
  _email TEXT;
  _tenant_name TEXT;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  IF _email IS NULL THEN
    RETURN NEW;
  END IF;
  FOR _inv IN
    SELECT * FROM public.tenant_invitations
    WHERE lower(email) = lower(_email) AND claimed_at IS NULL
  LOOP
    INSERT INTO public.tenant_admins (tenant_id, user_id, role)
    VALUES (_inv.tenant_id, NEW.user_id, _inv.role)
    ON CONFLICT DO NOTHING;
    UPDATE public.tenant_invitations SET claimed_at = now() WHERE id = _inv.id;

    -- Send welcome confirmation email
    SELECT name INTO _tenant_name FROM public.tenants WHERE id = _inv.tenant_id;
    PERFORM net.http_post(
      url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-invite-welcome',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
      body := jsonb_build_object(
        'email', _email,
        'tenantName', COALESCE(_tenant_name, 'your organization'),
        'role', _inv.role
      )
    );
  END LOOP;
  RETURN NEW;
END;
$function$;