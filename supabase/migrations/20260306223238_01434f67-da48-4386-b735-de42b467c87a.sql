
CREATE TABLE public.tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  invited_by uuid NOT NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations"
  ON public.tenant_invitations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant admins can manage their invitations"
  ON public.tenant_invitations FOR ALL
  TO authenticated
  USING (is_tenant_admin(tenant_id, auth.uid()))
  WITH CHECK (is_tenant_admin(tenant_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.claim_tenant_invitations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _inv RECORD;
  _email TEXT;
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
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_claim_tenant_invitations
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.claim_tenant_invitations();
