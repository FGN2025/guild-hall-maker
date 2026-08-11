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
  -- Impersonate a real tenant admin that still exists in auth.users, so the
  -- human cases exercise the real RLS policies rather than a fabricated uid.
  SELECT ta.tenant_id, ta.user_id INTO v_tenant, v_uid
  FROM public.tenant_admins ta
  JOIN public.tenants t ON t.id = ta.tenant_id
  JOIN auth.users u ON u.id = ta.user_id
  ORDER BY (t.slug = 'acme-broadband') DESC, ta.tenant_id
  LIMIT 1;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'SELFTEST_RESULT:%',
      jsonb_build_object('ok', false, 'error', 'no usable tenant_admins row to impersonate')::text;
  END IF;

  human_claims := jsonb_build_object('sub', v_uid, 'role', 'authenticated')::text;
  agent_claims := jsonb_build_object('sub', v_uid, 'role', 'authenticated',
                                     'client_id', 'selftest-mcp-client')::text;

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

  cases := jsonb_build_array(
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

    jsonb_build_object('id','V1','group','revision_loop','path','runner (service_role)',
      'desc','agent returns a rejected post to pending_review',
      'role','service_role','claims',NULL,'expect','allow',
      'sql',format($q$UPDATE public.scheduled_posts SET status='pending_review', caption='revised' WHERE id=%L$q$, p_r_rev)),
    jsonb_build_object('id','V2','group','revision_loop','path','oauth mcp (authenticated + client_id)',
      'desc','agent returns a rejected post to pending_review',
      'role','authenticated','claims',agent_claims,'expect','allow',
      'sql',format($q$UPDATE public.scheduled_posts SET status='pending_review', caption='revised' WHERE id=%L$q$, p_o_rev)),

    jsonb_build_object('id','D1','group','dispatcher','path','runner (service_role)',
      'desc','publisher carries an already-approved post forward: pending -> published',
      'role','service_role','claims',NULL,'expect','allow',
      'sql',format($q$UPDATE public.scheduled_posts SET status='published', published_at=now() WHERE id=%L$q$, p_d_pub)),
    jsonb_build_object('id','D2','group','dispatcher','path','runner (service_role)',
      'desc','publisher marks an approved post failed: pending -> failed',
      'role','service_role','claims',NULL,'expect','allow',
      'sql',format($q$UPDATE public.scheduled_posts SET status='failed', error_message='selftest' WHERE id=%L$q$, p_d_fail)),

    jsonb_build_object('id','X1','group','adjacent','path','anon',
      'desc','anon cannot read tenants.contact_email (column-level grant)',
      'role','anon','claims',NULL,'expect','deny','pattern','permission denied%',
      'sql',$q$SELECT contact_email FROM public.tenants LIMIT 1$q$),
    jsonb_build_object('id','X2','group','adjacent','path','anon',
      'desc','anon cannot execute the guarded registration-count aggregate',
      'role','anon','claims',NULL,'expect','deny','pattern','permission denied%',
      'sql',$q$SELECT public.get_tournament_registration_counts()$q$),
    jsonb_build_object('id','X3','group','adjacent','path','anon',
      'desc','public capacity aggregate stays callable by anon',
      'role','anon','claims',NULL,'expect','allow',
      'sql',$q$SELECT public.get_tournament_capacity()$q$),
    jsonb_build_object('id','X4','group','adjacent','path','anon',
      'desc','anon reads zero social_connections rows (token exposure)',
      'role','anon','claims',NULL,'expect','allow',
      'sql',$q$DO $$ DECLARE n int; BEGIN SELECT count(*) INTO n FROM public.social_connections; IF n > 0 THEN RAISE EXCEPTION 'anon can read % social_connections rows', n; END IF; END $$$q$)
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