-- Marketing-role parity for the marketing automation (approved plan, 2026-09-12).
-- Approve/publish a campaign was admin/manager-only via the with_check; widen to is_tenant_marketer.
DROP POLICY "Tenant marketers can update own drafts" ON public.marketing_campaigns;
CREATE POLICY "Tenant marketers can update own drafts"
ON public.marketing_campaigns
FOR UPDATE
USING (
  tenant_id IS NOT NULL
  AND status = ANY (ARRAY['draft','pending_review','rejected'])
  AND (proposed_by = auth.uid() OR is_tenant_marketer(tenant_id, auth.uid()))
)
WITH CHECK (
  tenant_id IS NOT NULL
  AND is_tenant_marketer(tenant_id, auth.uid())
);

-- Assets: publishing (is_published=true) was admin/manager-only; widen to is_tenant_marketing_member.
DROP POLICY "Tenant marketing members can insert assets" ON public.tenant_marketing_assets;
CREATE POLICY "Tenant marketing members can insert assets"
ON public.tenant_marketing_assets
FOR INSERT
WITH CHECK (is_tenant_marketing_member(tenant_id, auth.uid()));

DROP POLICY "Tenant marketing members can update assets" ON public.tenant_marketing_assets;
CREATE POLICY "Tenant marketing members can update assets"
ON public.tenant_marketing_assets
FOR UPDATE
USING (is_tenant_marketing_member(tenant_id, auth.uid()))
WITH CHECK (is_tenant_marketing_member(tenant_id, auth.uid()));