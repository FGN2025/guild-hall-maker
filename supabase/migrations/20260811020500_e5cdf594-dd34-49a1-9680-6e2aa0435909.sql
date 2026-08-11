-- =====================================================================
-- Standing regression matrix for the pending_review approval ceiling.
--
-- Runs against the REAL database (roles, GUC claims, column defaults,
-- SECURITY INVOKER/DEFINER semantics) because that is where the entire
-- class of bug lives. A mocked version would have passed while the
-- ceiling was wide open.
--
-- Safety: every row is created by the harness and referenced by its own
-- id. The body raises at the end, so the whole run -- setup rows,
-- successful writes, notification side effects -- is rolled back by the
-- subtransaction. Nothing it does can ever persist.
-- =====================================================================

CREATE OR REPLACE FUNCTION public._selftest_review_ceiling_body()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_tenant uuid;
  v_uid    uuid;
  human_claims text;
  agent_claims text;
  c_pending  uuid := gen_random_uuid();
  c_human    uuid := gen_random_uuid();
  a_runner   uuid := gen_random_uuid();
  a_oauth    uuid := gen_random_uuid();
  a_human    uuid := gen_random_uuid();
  p_r_appr   uuid := gen_random_uuid();
  p_o_appr   uuid := gen_random_uuid();
  p_h_appr   uuid := gen_random_uuid();
  p_h_rej    uuid := gen_random_uuid();
  p_r_rev    uuid := gen_random_uuid();
  p_o_rev    uuid := gen_random_uuid();
  p_d_pub    uuid := gen_random_uuid();
  p_d_fail   uuid := gen_random_uuid();
  cases   jsonb;
  c       jsonb;
  results jsonb := '[]'::jsonb;
  ok      boolean;
  detail  text;
  pattern text;
BEGIN
  SELECT ta.tenant_id, ta.user_id INTO v_tenant, v_uid
  FROM public.tenant_admins ta
  JOIN public.tenants t ON t.id = ta.tenant_id
  ORDER BY (t.slug = 'acme-broadband') DESC, ta.tenant_id
  LIMIT 1;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'SELFTEST_RESULT:%',
      jsonb_build_object('ok', false, 'error', 'no tenant_admins row to impersonate')::text;
  END IF;

  human_claims := jsonb_build_object('sub', v_uid, 'role', 'authenticated')::text;
  agent_claims := jsonb_build_object('sub', v_uid, 'role', 'authenticated',
                                     'client_id', 'selftest-mcp-client')::text;

  -- ---------------- setup rows (created and owned by this harness) ----
  INSERT INTO public.marketing_campaigns (id, tenant_id, title, created_by, status, agent_source, proposed_by)
  VALUES (c_pending, v_tenant, '__ceiling_selftest__ pending', v_uid, 'pending_review', 'selftest', v_uid),
         (c_human,   v_tenant, '__ceiling_selftest__ human',   v_uid, 'pending_review', 'selftest', v_uid);

  INSERT INTO public.tenant_marketing_assets (id, tenant_id, file_name, file_path, url, created_by, is_published, agent_source, proposed_by)
  SELECT x.id, v_tenant, '__ceiling_selftest__.png',
         '__ceiling_selftest__/' || x.id::text || '.png',
         'https://example.invalid/__ceiling_selftest__/' || x.id::text || '.png',
         v_uid, false, 'selftest', v_uid
  FROM (VALUES (a_runner), (a_oauth), (a_human)) AS x(id);

  INSERT INTO public.scheduled_posts (id, tenant_id, user_id, platform, image_url, scheduled_at, status, agent_source, proposed_by)
  SELECT x.id, v_tenant, v_uid, 'facebook', 'https://example.invalid/x.png', now() + interval '30 days',
         x.st, 'selftest', v_uid
  FROM (VALUES (p_r_appr, 'pending_review'), (p_o_appr, 'pending_review'),
               (p_h_appr, 'pending_review'), (p_h_rej,  'pending_review'),
               (p_r_rev,  'rejected'),       (p_o_rev,  'rejected'),
               (p_d_pub,  'pending'),        (p_d_fail, 'pending')) AS x(id, st);

  -- ---------------- the matrix ----------------------------------------
  cases := jsonb_build_array(
    -- 8 agent refusals: 4 shapes x 2 agent paths ---------------------------
    jsonb_build_object('id','A1-runner','group','agent_refusal','path','runner (service_role)',
      'desc','insert scheduled_post with explicit publishable status',
      'role','service_role','claims',NULL,'expect','deny',
      'sql',format($q$INSERT INTO public.scheduled_posts (tenant_id,user_id,platform,image_url,scheduled_at,status,agent_source)
                      VALUES (%L,%L,'facebook','https://example.invalid/x.png', now()+interval '30 days','pending','selftest')$q$, v_tenant, v_uid)),
    jsonb_build_object('id','A2-runner','group','agent_refusal','path','runner (service_role)',
      'desc','insert scheduled_post OMITTING status (column default is the publishable ''pending'')',
      'role','service_role','claims',NULL,'expect','deny',
      'sql',format($q$INSERT INTO public.scheduled_posts (tenant_id,user_id,platform,image_url,scheduled_at,agent_source)
                      VALUES (%L,%L,'facebook','https://example.invalid/x.png', now()+interval '30 days','selftest')$q$, v_tenant, v_uid)),
    jsonb_build_object('id','A3-runner','group','agent_refusal','path','runner (service_role)',
      'desc','approve itself: pending_review -> pending',
      'role','service_role','claims',NULL,'expect','deny',
      'sql',format($q$UPDATE public.scheduled_posts SET status='pending' WHERE id=%L$q$, p_r_appr)),
    jsonb_build_object('id','A4-runner','group','agent_refusal','path','runner (service_role)',
      'desc','publish an asset: is_published false -> true',
      'role','service_role','claims',NULL,'expect','deny',
      'sql',format($q$UPDATE public.tenant_marketing_assets SET is_published=true WHERE id=%L$q$, a_runner)),
    jsonb_build_object('id','A1-oauth','group','agent_refusal','path','oauth mcp (authenticated + client_id)',
      'desc','insert scheduled_post with explicit publishable status',
      'role','authenticated','claims',agent_claims,'expect','deny',
      'sql',format($q$INSERT INTO public.scheduled_posts (tenant_id,user_id,platform,image_url,scheduled_at,status,agent_source)
                      VALUES (%L,%L,'facebook','https://example.invalid/x.png', now()+interval '30 days','pending','selftest')$q$, v_tenant, v_uid)),
    jsonb_build_object('id','A2-oauth','group','agent_refusal','path','oauth mcp (authenticated + client_id)',
      'desc','insert scheduled_post OMITTING status (publishable default)',
      'role','authenticated','claims',agent_claims,'expect','deny',
      'sql',format($q$INSERT INTO public.scheduled_posts (tenant_id,user_id,platform,image_url,scheduled_at,agent_source)
                      VALUES (%L,%L,'facebook','https://example.invalid/x.png', now()+interval '30 days','selftest')$q$, v_tenant, v_uid)),
    jsonb_build_object('id','A3-oauth','group','agent_refusal','path','oauth mcp (authenticated + client_id)',
      'desc','approve itself: pending_review -> pending',
      'role','authenticated','claims',agent_claims,'expect','deny',
      'sql',format($q$UPDATE public.scheduled_posts SET status='pending' WHERE id=%L$q$, p_o_appr)),
    jsonb_build_object('id','A4-oauth','group','agent_refusal','path','oauth mcp (authenticated + client_id)',
      'desc','publish a campaign: is_published false -> true',
      'role','authenticated','claims',agent_claims,'expect','deny',
      'sql',format($q$UPDATE public.marketing_campaigns SET is_published=true, status='published' WHERE id=%L$q$, c_pending)),

    -- 4 human successes ----------------------------------------------------
    jsonb_build_object('id','H1','group','human_success','path','dashboard (authenticated, no client_id)',
      'desc','tenant admin approves a post: pending_review -> pending',
      'role','authenticated','claims',human_claims,'expect','allow',
      'sql',format($q$UPDATE public.scheduled_posts SET status='pending' WHERE id=%L$q$, p_h_appr)),
    jsonb_build_object('id','H2','group','human_success','path','dashboard (authenticated, no client_id)',
      'desc','tenant admin rejects a post with feedback',
      'role','authenticated','claims',human_claims,'expect','allow',
      'sql',format($q$UPDATE public.scheduled_posts SET status='rejected', feedback_note='selftest' WHERE id=%L$q$, p_h_rej)),
    jsonb_build_object('id','H3','group','human_success','path','dashboard (authenticated, no client_id)',
      'desc','tenant admin approves and publishes a campaign',
      'role','authenticated','claims',human_claims,'expect','allow',
      'sql',format($q$UPDATE public.marketing_campaigns SET status='approved', is_published=true WHERE id=%L$q$, c_human)),
    jsonb_build_object('id','H4','group','human_success','path','dashboard (authenticated, no client_id)',
      'desc','tenant admin publishes an asset',
      'role','authenticated','claims',human_claims,'expect','allow',
      'sql',format($q$UPDATE public.tenant_marketing_assets SET is_published=true WHERE id=%L$q$, a_human)),

    -- 2 revision-loop cases ------------------------------------------------
    jsonb_build_object('id','V1','group','revision_loop','path','runner (service_role)',
      'desc','agent returns a rejected post to pending_review',
      'role','service_role','claims',NULL,'expect','allow',
      'sql',format($q$UPDATE public.scheduled_posts SET status='pending_review', caption='revised' WHERE id=%L$q$, p_r_rev)),
    jsonb_build_object('id','V2','group','revision_loop','path','oauth mcp (authenticated + client_id)',
      'desc','agent returns a rejected post to pending_review',
      'role','authenticated','claims',agent_claims,'expect','allow',
      'sql',format($q$UPDATE public.scheduled_posts SET status='pending_review', caption='revised' WHERE id=%L$q$, p_o_rev)),

    -- 2 dispatcher cases ---------------------------------------------------
    jsonb_build_object('id','D1','group','dispatcher','path','runner (service_role)',
      'desc','publisher carries an already-approved post forward: pending -> published',
      'role','service_role','claims',NULL,'expect','allow',
      'sql',format($q$UPDATE public.scheduled_posts SET status='published', published_at=now() WHERE id=%L$q$, p_d_pub)),
    jsonb_build_object('id','D2','group','dispatcher','path','runner (service_role)',
      'desc','publisher marks an approved post failed: pending -> failed',
      'role','service_role','claims',NULL,'expect','allow',
      'sql',format($q$UPDATE public.scheduled_posts SET status='failed', error_message='selftest' WHERE id=%L$q$, p_d_fail)),

    -- adjacent guarantees (cheap additions) --------------------------------
    jsonb_build_object('id','X1','group','adjacent','path','anon',
      'desc','anon cannot read tenants.contact_email (column-level grant)',
      'role','anon','claims',NULL,'expect','deny','pattern','permission denied%',
      'sql',$q$SELECT contact_email FROM public.tenants LIMIT 1$q$),
    jsonb_build_object('id','X2','group','adjacent','path','anon',
      'desc','anon cannot execute the guarded registration-count aggregate',
      'role','anon','claims',NULL,'expect','deny','pattern','permission denied%',
      'sql',format($q$SELECT public.get_tournament_registration_counts()$q$)),
    jsonb_build_object('id','X3','group','adjacent','path','anon',
      'desc','public capacity aggregate stays callable by anon',
      'role','anon','claims',NULL,'expect','allow',
      'sql',$q$SELECT public.get_tournament_capacity()$q$),
    jsonb_build_object('id','X4','group','adjacent','path','anon',
      'desc','anon reads no social_connections rows (token exposure)',
      'role','anon','claims',NULL,'expect','allow','assert_zero','social_connections',
      'sql',$q$SELECT 1 FROM public.social_connections LIMIT 1$q$)
  );

  FOR c IN SELECT jsonb_array_elements(cases) LOOP
    BEGIN
      EXECUTE format('SET LOCAL ROLE %I', c->>'role');
      PERFORM set_config('request.jwt.claims', c->>'claims', true);
      EXECUTE (c->>'sql');
      IF (c->>'expect') = 'allow' THEN
        ok := true; detail := 'statement succeeded, as required';
      ELSE
        ok := false; detail := 'STATEMENT SUCCEEDED BUT SHOULD HAVE BEEN REFUSED';
      END IF;
    EXCEPTION WHEN others THEN
      detail := SQLERRM;
      IF (c->>'expect') = 'allow' THEN
        ok := false;
      ELSE
        -- A refusal only counts if it is the RIGHT refusal. Without this the
        -- suite would go green on an unrelated NOT NULL or RLS error.
        pattern := COALESCE(c->>'pattern', 'review ceiling%');
        ok := detail LIKE pattern;
        IF NOT ok THEN
          detail := format('refused, but for the wrong reason (expected %L): %s', pattern, detail);
        END IF;
      END IF;
    END;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', NULL, true);

    results := results || jsonb_build_object(
      'id', c->>'id', 'group', c->>'group', 'path', c->>'path',
      'case', c->>'desc', 'expect', c->>'expect', 'passed', ok, 'detail', detail);
  END LOOP;

  RAISE EXCEPTION 'SELFTEST_RESULT:%', jsonb_build_object(
    'ok', NOT EXISTS (SELECT 1 FROM jsonb_array_elements(results) r WHERE (r->>'passed')::boolean IS NOT TRUE),
    'total', jsonb_array_length(results),
    'failed', (SELECT count(*) FROM jsonb_array_elements(results) r WHERE (r->>'passed')::boolean IS NOT TRUE),
    'cases', results)::text;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.selftest_review_ceiling()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  msg text;
BEGIN
  PERFORM public._selftest_review_ceiling_body();
  RETURN jsonb_build_object('ok', false, 'error', 'harness did not roll back; treat as failure');
EXCEPTION WHEN others THEN
  msg := SQLERRM;
  IF msg LIKE 'SELFTEST_RESULT:%' THEN
    RETURN substring(msg from length('SELFTEST_RESULT:') + 1)::jsonb;
  END IF;
  RETURN jsonb_build_object('ok', false, 'error', msg);
END;
$fn$;

REVOKE ALL ON FUNCTION public._selftest_review_ceiling_body() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.selftest_review_ceiling() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.selftest_review_ceiling() TO service_role;