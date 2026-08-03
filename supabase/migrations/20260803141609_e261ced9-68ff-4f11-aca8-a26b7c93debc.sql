CREATE TABLE public.tenant_challenge_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  headline text,
  promo_copy text,
  is_featured boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, challenge_id, starts_at)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_challenge_schedules TO authenticated;
GRANT SELECT ON public.tenant_challenge_schedules TO anon;
GRANT ALL ON public.tenant_challenge_schedules TO service_role;

ALTER TABLE public.tenant_challenge_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view challenge schedules"
ON public.tenant_challenge_schedules FOR SELECT
USING (true);

CREATE POLICY "Tenant staff can manage challenge schedules"
ON public.tenant_challenge_schedules FOR ALL
TO authenticated
USING (
  public.is_tenant_admin_or_manager(tenant_id, auth.uid())
  OR public.is_tenant_marketing_member(tenant_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.is_tenant_admin_or_manager(tenant_id, auth.uid())
  OR public.is_tenant_marketing_member(tenant_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE OR REPLACE FUNCTION public.validate_tenant_challenge_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ends_at <= NEW.starts_at THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = NEW.challenge_id AND c.is_active = true) THEN
    RAISE EXCEPTION 'Challenge must be active to be scheduled';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_tenant_challenge_schedule
BEFORE INSERT OR UPDATE ON public.tenant_challenge_schedules
FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_challenge_schedule();

CREATE TRIGGER trg_tenant_challenge_schedules_updated_at
BEFORE UPDATE ON public.tenant_challenge_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.challenge_window_open(_challenge_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid;
BEGIN
  IF public.has_role(_user_id, 'admin'::app_role) OR public.has_role(_user_id, 'moderator'::app_role) THEN
    RETURN true;
  END IF;

  _tenant := public.get_user_tenant(_user_id);
  IF _tenant IS NULL THEN
    RETURN true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_challenge_schedules s
    WHERE s.tenant_id = _tenant AND s.challenge_id = _challenge_id
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.tenant_challenge_schedules s
    WHERE s.tenant_id = _tenant
      AND s.challenge_id = _challenge_id
      AND now() >= s.starts_at
      AND now() <= s.ends_at
  );
END;
$$;

DROP POLICY IF EXISTS "Users can enroll themselves" ON public.challenge_enrollments;
CREATE POLICY "Users can enroll themselves"
ON public.challenge_enrollments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.challenge_window_open(challenge_id, auth.uid())
);

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS source_challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL;