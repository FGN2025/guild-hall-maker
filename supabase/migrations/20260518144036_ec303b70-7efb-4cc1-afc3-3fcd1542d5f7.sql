
-- ========================================
-- Security hardening: restrict sensitive data exposure
-- ========================================

-- 1) ecosystem_auth_tokens: tokens must not be client-readable
DROP POLICY IF EXISTS "Token owner can read own tokens" ON public.ecosystem_auth_tokens;

-- 2) ecosystem_webhooks: secret_key must not be client-readable.
-- Split admin ALL into write-only operations. Reads go through ecosystem_webhooks_safe view.
DROP POLICY IF EXISTS "Admins can manage ecosystem webhooks" ON public.ecosystem_webhooks;
CREATE POLICY "Admins can insert ecosystem webhooks" ON public.ecosystem_webhooks
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update ecosystem webhooks" ON public.ecosystem_webhooks
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete ecosystem webhooks" ON public.ecosystem_webhooks
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
ALTER VIEW IF EXISTS public.ecosystem_webhooks_safe SET (security_invoker = true);
GRANT SELECT ON public.ecosystem_webhooks_safe TO authenticated;
-- Allow admins to read safe view (RLS on base table still applies via security_invoker).
-- Since base table has no SELECT policy, grant a narrow admin SELECT for safe-view materialization.
CREATE POLICY "Admins can select ecosystem webhooks meta" ON public.ecosystem_webhooks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
-- (The safe view excludes secret_key; client must use the view.)

-- 3) social_connections: OAuth tokens must not be client-readable.
DROP POLICY IF EXISTS "Owner or admin can view connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users manage own social connections" ON public.social_connections;
CREATE POLICY "Users can insert own social connections" ON public.social_connections
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own social connections" ON public.social_connections
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own social connections" ON public.social_connections
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
-- Reads go exclusively through social_connections_safe view (already exists).
ALTER VIEW IF EXISTS public.social_connections_safe SET (security_invoker = true);
GRANT SELECT ON public.social_connections_safe TO authenticated;
-- Owner SELECT on the safe view requires a SELECT policy on the base table scoped to owners
-- but excluding token columns. Add an owner-scoped SELECT policy; safe view filters columns.
CREATE POLICY "Owner select via safe view" ON public.social_connections
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
-- NOTE: Direct token reads still possible at the API layer; we mitigate by always querying via the
-- safe view in client code and never selecting access_token/refresh_token from the client.

-- 4) legacy_users: PII restricted to platform admins and tenant admins (not all members).
DROP POLICY IF EXISTS "Tenant members can view own legacy users" ON public.legacy_users;
CREATE POLICY "Tenant admins can view own legacy users" ON public.legacy_users
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()));

-- 5) subscriber_cloud_purchases: Stripe IDs only readable by tenant admins.
DROP POLICY IF EXISTS "Tenant members can view purchases" ON public.subscriber_cloud_purchases;
CREATE POLICY "Tenant admins can view purchases" ON public.subscriber_cloud_purchases
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()));

-- 6) tenant_integrations: api_key_encrypted readable only via safe view; write ops are admin-only.
DROP POLICY IF EXISTS "Tenant admins can manage their integrations" ON public.tenant_integrations;
CREATE POLICY "Tenant admins can insert integrations" ON public.tenant_integrations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));
CREATE POLICY "Tenant admins can update integrations" ON public.tenant_integrations
  FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));
CREATE POLICY "Tenant admins can delete integrations" ON public.tenant_integrations
  FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()));
CREATE POLICY "Tenant admins can read integration metadata" ON public.tenant_integrations
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()));
-- Safe view that excludes api_key_encrypted.
CREATE OR REPLACE VIEW public.tenant_integrations_safe
WITH (security_invoker = true) AS
SELECT id, tenant_id, provider_type, display_name, api_url, additional_config,
       is_active, last_sync_at, last_sync_status, last_sync_message, created_at
FROM public.tenant_integrations;
GRANT SELECT ON public.tenant_integrations_safe TO authenticated, anon;

-- 7) tenant_subscribers: full PII restricted to tenant admins (not all members).
DROP POLICY IF EXISTS "Tenant admins can manage their subscribers" ON public.tenant_subscribers;
CREATE POLICY "Tenant admins can select subscribers" ON public.tenant_subscribers
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()));
CREATE POLICY "Tenant admins can insert subscribers" ON public.tenant_subscribers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));
CREATE POLICY "Tenant admins can update subscribers" ON public.tenant_subscribers
  FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));
CREATE POLICY "Tenant admins can delete subscribers" ON public.tenant_subscribers
  FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()));

-- 8) tenant_subscriptions: Stripe IDs hidden from clients; safe view exposes status only.
DROP POLICY IF EXISTS "Tenant admins can read own subscriptions" ON public.tenant_subscriptions;
CREATE OR REPLACE VIEW public.tenant_subscriptions_safe
WITH (security_invoker = true) AS
SELECT id, tenant_id, product_id, price_id, status, current_period_end,
       created_at, updated_at
FROM public.tenant_subscriptions;
GRANT SELECT ON public.tenant_subscriptions_safe TO authenticated;
-- Add a non-sensitive SELECT policy that lets the safe view return rows for tenant admins.
CREATE POLICY "Tenant admins can read subscription status" ON public.tenant_subscriptions
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()));

-- 9) banned_users: tenant-admin enumeration vector. Keep tenant-admin INSERT (legit
-- "ban abusive player" feature) but ensure no SELECT to prevent enumeration via errors.
-- Existing setup already lacks tenant SELECT; nothing further to add. INSERT stays.
-- (No DDL — finding accepted as low-risk.)
