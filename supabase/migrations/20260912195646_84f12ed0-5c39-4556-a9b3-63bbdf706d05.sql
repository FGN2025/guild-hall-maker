CREATE OR REPLACE VIEW public.social_connections_safe
WITH (security_invoker = on) AS
SELECT id,
    tenant_id,
    user_id,
    platform,
    account_name,
    page_id,
    is_active,
    token_expires_at,
    created_at,
    updated_at,
    token_checked_at,
    token_check_error
   FROM social_connections;