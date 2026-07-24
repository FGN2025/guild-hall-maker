-- Cleanup accidentally-inserted test row (sandbox_exec bypasses RLS) and
-- create a helper function to exercise RLS as an arbitrary authenticated
-- user for the marketing-tool bundle verification.
DELETE FROM public.marketing_campaigns WHERE title = 'RLS-TEST-1a';

CREATE OR REPLACE FUNCTION public.rls_probe_marketing(
  _as_user uuid,
  _tenant  uuid,
  _op      text  -- 'campaign' | 'asset' | 'post'
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  msg text;
BEGIN
  -- Impersonate the target user for auth.uid()/auth.jwt() usage inside RLS.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', _as_user::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  BEGIN
    IF _op = 'campaign' THEN
      INSERT INTO public.marketing_campaigns
        (tenant_id, title, status, is_published, created_by, proposed_by, agent_source)
      VALUES (_tenant, 'RLS-PROBE-'||_op||'-'||gen_random_uuid()::text,
        'pending_review', false, _as_user, _as_user, 'claude-mcp');
    ELSIF _op = 'asset' THEN
      INSERT INTO public.tenant_marketing_assets
        (tenant_id, file_name, file_path, url, label, is_published,
         agent_source, proposed_by, created_by)
      VALUES (_tenant, 'probe.png', _tenant||'/probe/'||gen_random_uuid()||'.png',
        'https://example.com/probe.png', 'Probe', false,
        'claude-mcp', _as_user, _as_user);
    ELSIF _op = 'post' THEN
      INSERT INTO public.scheduled_posts
        (tenant_id, user_id, platform, image_url, caption, scheduled_at,
         status, agent_source, proposed_by)
      VALUES (_tenant, _as_user, 'discord',
        'https://example.com/probe.png', 'probe',
        now() + interval '1 day', 'pending_review',
        'claude-mcp', _as_user);
    ELSE
      RETURN 'unknown op';
    END IF;
    RETURN 'INSERTED (RLS ALLOWED)';
  EXCEPTION
    WHEN insufficient_privilege THEN
      GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
      RETURN 'DENIED: ' || msg;
    WHEN others THEN
      GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
      RETURN 'ERROR: ' || SQLSTATE || ' ' || msg;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.rls_probe_marketing(uuid, uuid, text) FROM PUBLIC;
-- Only service_role can execute this probe.
GRANT EXECUTE ON FUNCTION public.rls_probe_marketing(uuid, uuid, text) TO service_role;

-- Also probe SELECT visibility (list_pending_agent_drafts / list_tenant_assets
-- back onto their base tables).
CREATE OR REPLACE FUNCTION public.rls_probe_read_marketing(
  _as_user uuid,
  _tenant  uuid
) RETURNS TABLE(source text, visible_rows bigint)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', _as_user::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  RETURN QUERY
    SELECT 'tenant_marketing_assets'::text,
           (SELECT count(*) FROM public.tenant_marketing_assets a WHERE a.tenant_id = _tenant);
  RETURN QUERY
    SELECT 'marketing_campaigns'::text,
           (SELECT count(*) FROM public.marketing_campaigns c WHERE c.tenant_id = _tenant);
  RETURN QUERY
    SELECT 'scheduled_posts'::text,
           (SELECT count(*) FROM public.scheduled_posts p WHERE p.tenant_id = _tenant);
END;
$$;

REVOKE ALL ON FUNCTION public.rls_probe_read_marketing(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_probe_read_marketing(uuid, uuid) TO service_role;