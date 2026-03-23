-- Recreate the view with security_invoker = true so it respects underlying RLS
CREATE OR REPLACE VIEW public.social_connections_safe
WITH (security_invoker = true)
AS
SELECT id, tenant_id, user_id, platform, account_name, page_id, is_active, token_expires_at, created_at, updated_at
FROM public.social_connections;