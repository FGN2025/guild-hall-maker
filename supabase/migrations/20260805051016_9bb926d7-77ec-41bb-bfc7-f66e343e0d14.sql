DROP POLICY IF EXISTS "Authenticated can view published campaigns" ON public.marketing_campaigns;
CREATE POLICY "Authenticated can view published campaigns"
ON public.marketing_campaigns
FOR SELECT
TO authenticated
USING (
  is_published = true
  AND (tenant_id IS NULL OR public.is_tenant_member(tenant_id, auth.uid()))
);

DROP POLICY IF EXISTS "Authenticated can view published campaign assets" ON public.marketing_assets;
CREATE POLICY "Authenticated can view published campaign assets"
ON public.marketing_assets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_campaigns mc
    WHERE mc.id = marketing_assets.campaign_id
      AND mc.is_published = true
      AND (mc.tenant_id IS NULL OR public.is_tenant_member(mc.tenant_id, auth.uid()))
  )
);