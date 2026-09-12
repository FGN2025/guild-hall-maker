-- 1. agent_runs: require tenant membership on insert
DROP POLICY IF EXISTS agent_runs_insert_self ON public.agent_runs;
CREATE POLICY agent_runs_insert_self ON public.agent_runs
FOR INSERT TO authenticated
WITH CHECK (
  launched_by = auth.uid()
  AND (
    public.is_tenant_member(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 2. social_connections: require tenant membership on insert
DROP POLICY IF EXISTS "Users can insert own social connections" ON public.social_connections;
CREATE POLICY "Users can insert own social connections" ON public.social_connections
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_tenant_member(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 3. scheduled_posts: self policy must stay inside the user's own tenant scope,
--    and may only reference that tenant's connections and campaigns.
DROP POLICY IF EXISTS "Users manage own scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Users manage own scheduled posts" ON public.scheduled_posts
FOR ALL TO authenticated
USING (
  user_id = auth.uid()
  AND (
    tenant_id IS NULL
    OR public.is_tenant_member(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    tenant_id IS NULL
    OR public.is_tenant_member(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  AND (
    connection_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.social_connections sc
      WHERE sc.id = scheduled_posts.connection_id
        AND (sc.user_id = auth.uid() OR sc.tenant_id = scheduled_posts.tenant_id)
        AND (sc.tenant_id = scheduled_posts.tenant_id OR scheduled_posts.tenant_id IS NULL)
    )
  )
  AND (
    campaign_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.marketing_campaigns mc
      WHERE mc.id = scheduled_posts.campaign_id
        AND (mc.tenant_id = scheduled_posts.tenant_id
             OR public.is_tenant_member(mc.tenant_id, auth.uid()))
    )
  )
);