
-- Helper
CREATE OR REPLACE FUNCTION public.is_tenant_marketer(_tenant_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'marketing'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenant_admins
      WHERE tenant_id = _tenant_id
        AND user_id = _user_id
        AND role IN ('admin', 'manager', 'marketing')
    )
$$;

-- tenants: timezone
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

-- marketing_campaigns
ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS agent_source text,
  ADD COLUMN IF NOT EXISTS proposed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS feedback_note text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS target_platforms text[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  ALTER TABLE public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_status_chk
    CHECK (status IN ('draft','pending_review','approved','rejected','published'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS marketing_campaigns_tenant_idem_uidx
  ON public.marketing_campaigns (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DROP POLICY IF EXISTS "Tenant marketers can insert campaigns" ON public.marketing_campaigns;
CREATE POLICY "Tenant marketers can insert campaigns"
  ON public.marketing_campaigns FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.is_tenant_marketer(tenant_id, auth.uid())
    AND (agent_source IS NULL OR (status IN ('draft','pending_review') AND is_published = false))
  );

DROP POLICY IF EXISTS "Tenant marketers can update own drafts" ON public.marketing_campaigns;
CREATE POLICY "Tenant marketers can update own drafts"
  ON public.marketing_campaigns FOR UPDATE TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND status IN ('draft','pending_review','rejected')
    AND (proposed_by = auth.uid() OR public.is_tenant_marketer(tenant_id, auth.uid()))
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.is_tenant_marketer(tenant_id, auth.uid())
  );

DROP POLICY IF EXISTS "Tenant members view tenant campaigns" ON public.marketing_campaigns;
CREATE POLICY "Tenant members view tenant campaigns"
  ON public.marketing_campaigns FOR SELECT TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));

-- tenant_marketing_assets
ALTER TABLE public.tenant_marketing_assets
  ADD COLUMN IF NOT EXISTS agent_source text,
  ADD COLUMN IF NOT EXISTS proposed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_url text;

-- scheduled_posts
ALTER TABLE public.scheduled_posts
  DROP CONSTRAINT IF EXISTS scheduled_posts_status_check;
ALTER TABLE public.scheduled_posts
  ADD CONSTRAINT scheduled_posts_status_check
  CHECK (status IN ('pending','pending_review','rejected','published','failed','cancelled'));

ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS proposed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agent_source text,
  ADD COLUMN IF NOT EXISTS feedback_note text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS scheduled_posts_tenant_idem_uidx
  ON public.scheduled_posts (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DROP TRIGGER IF EXISTS scheduled_posts_set_updated_at ON public.scheduled_posts;
CREATE TRIGGER scheduled_posts_set_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Tenant marketers insert scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Tenant marketers insert scheduled posts"
  ON public.scheduled_posts FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.is_tenant_marketer(tenant_id, auth.uid())
    AND (agent_source IS NULL OR status IN ('draft','pending_review'))
  );

DROP POLICY IF EXISTS "Tenant marketers update own drafts" ON public.scheduled_posts;
CREATE POLICY "Tenant marketers update own drafts"
  ON public.scheduled_posts FOR UPDATE TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND status IN ('draft','pending_review','rejected')
    AND (proposed_by = auth.uid() OR public.is_tenant_marketer(tenant_id, auth.uid()))
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.is_tenant_marketer(tenant_id, auth.uid())
  );

-- Storage policies for tenant-marketing bucket (bucket created out-of-band)
DROP POLICY IF EXISTS "Tenant members read tenant-marketing" ON storage.objects;
CREATE POLICY "Tenant members read tenant-marketing"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-marketing'
    AND public.is_tenant_member(
      NULLIF(split_part(name, '/', 1), '')::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tenant marketers write tenant-marketing" ON storage.objects;
CREATE POLICY "Tenant marketers write tenant-marketing"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-marketing'
    AND public.is_tenant_marketer(
      NULLIF(split_part(name, '/', 1), '')::uuid,
      auth.uid()
    )
  );

-- GRANTs
GRANT SELECT, INSERT, UPDATE ON public.marketing_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tenant_marketing_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.scheduled_posts TO authenticated;
GRANT ALL ON public.marketing_campaigns, public.tenant_marketing_assets, public.scheduled_posts TO service_role;
