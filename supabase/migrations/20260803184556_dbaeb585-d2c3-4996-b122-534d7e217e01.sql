-- marketing_campaigns: marketers may edit drafts but not approve/publish
DROP POLICY IF EXISTS "Tenant marketers can update own drafts" ON public.marketing_campaigns;
CREATE POLICY "Tenant marketers can update own drafts"
ON public.marketing_campaigns
FOR UPDATE
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'rejected'::text])
  AND ((proposed_by = auth.uid()) OR is_tenant_marketer(tenant_id, auth.uid()))
)
WITH CHECK (
  tenant_id IS NOT NULL
  AND is_tenant_marketer(tenant_id, auth.uid())
  AND (
    is_tenant_admin_or_manager(tenant_id, auth.uid())
    OR (
      status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'rejected'::text])
      AND is_published = false
    )
  )
);

DROP POLICY IF EXISTS "Tenant admins and managers can update campaigns" ON public.marketing_campaigns;
CREATE POLICY "Tenant admins and managers can update campaigns"
ON public.marketing_campaigns
FOR UPDATE
TO authenticated
USING (tenant_id IS NOT NULL AND is_tenant_admin_or_manager(tenant_id, auth.uid()))
WITH CHECK (tenant_id IS NOT NULL AND is_tenant_admin_or_manager(tenant_id, auth.uid()));

-- tenant_marketing_assets: split the blanket manage policy so publishing requires admin/manager
DROP POLICY IF EXISTS "Tenant admin and marketing can manage" ON public.tenant_marketing_assets;

CREATE POLICY "Tenant marketing members can view assets"
ON public.tenant_marketing_assets
FOR SELECT
TO authenticated
USING (is_tenant_marketing_member(tenant_id, auth.uid()));

CREATE POLICY "Tenant marketing members can insert assets"
ON public.tenant_marketing_assets
FOR INSERT
TO authenticated
WITH CHECK (
  is_tenant_marketing_member(tenant_id, auth.uid())
  AND (is_published = false OR is_tenant_admin_or_manager(tenant_id, auth.uid()))
);

CREATE POLICY "Tenant marketing members can update assets"
ON public.tenant_marketing_assets
FOR UPDATE
TO authenticated
USING (is_tenant_marketing_member(tenant_id, auth.uid()))
WITH CHECK (
  is_tenant_marketing_member(tenant_id, auth.uid())
  AND (is_published = false OR is_tenant_admin_or_manager(tenant_id, auth.uid()))
);

CREATE POLICY "Tenant marketing members can delete assets"
ON public.tenant_marketing_assets
FOR DELETE
TO authenticated
USING (is_tenant_marketing_member(tenant_id, auth.uid()));