-- 1. Add user_id linking column to tenant_subscribers
ALTER TABLE public.tenant_subscribers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_subscribers_user_id
  ON public.tenant_subscribers(user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_subscribers_email_lower
  ON public.tenant_subscribers(lower(email));

-- 2. Mark a web_page as a tenant branded banner
ALTER TABLE public.web_pages
  ADD COLUMN IF NOT EXISTS is_tenant_banner boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS one_banner_per_tenant
  ON public.web_pages(tenant_id)
  WHERE is_tenant_banner = true;

-- 3. Subscriber self-read policy
DROP POLICY IF EXISTS "Subscribers can view their own record" ON public.tenant_subscribers;
CREATE POLICY "Subscribers can view their own record"
  ON public.tenant_subscribers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Helper: resolve a user's active tenant (admin first, then subscriber)
CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM (
    (SELECT tenant_id, created_at, 1 AS priority
       FROM public.tenant_admins
      WHERE user_id = _user_id)
    UNION ALL
    (SELECT tenant_id, created_at, 2 AS priority
       FROM public.tenant_subscribers
      WHERE user_id = _user_id)
  ) q
  ORDER BY priority ASC, created_at ASC
  LIMIT 1;
$$;

-- 5. Auto-link subscriber rows when a profile is created
CREATE OR REPLACE FUNCTION public.claim_subscriber_records()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  IF _email IS NULL THEN RETURN NEW; END IF;

  UPDATE public.tenant_subscribers
    SET user_id = NEW.user_id,
        updated_at = now()
  WHERE user_id IS NULL
    AND lower(email) = lower(_email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_claim_subscriber_on_profile ON public.profiles;
CREATE TRIGGER trg_claim_subscriber_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_subscriber_records();

-- 6. Backfill existing user accounts -> subscriber rows
UPDATE public.tenant_subscribers ts
SET user_id = u.id,
    updated_at = now()
FROM auth.users u
WHERE ts.user_id IS NULL
  AND ts.email IS NOT NULL
  AND lower(ts.email) = lower(u.email);