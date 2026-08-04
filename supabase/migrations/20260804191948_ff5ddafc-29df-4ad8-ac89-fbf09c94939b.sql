DO $$
DECLARE
  v_tenant uuid := '41a2e493-079a-4a17-a3a9-aebdd5fe5f81';
  v_assets int;
  v_campaigns int;
  v_posts int;
BEGIN
  CREATE TEMP TABLE _seed_campaigns ON COMMIT DROP AS
  SELECT id FROM public.marketing_campaigns
  WHERE tenant_id = v_tenant
    AND title LIKE '%August Seed%'
    AND created_at >= '2026-07-29' AND created_at < '2026-07-30';

  IF (SELECT count(*) FROM _seed_campaigns) <> 14 THEN
    RAISE EXCEPTION 'expected 14 stranded seed campaigns, found %', (SELECT count(*) FROM _seed_campaigns);
  END IF;

  DELETE FROM public.scheduled_posts
  WHERE tenant_id = v_tenant AND campaign_id IN (SELECT id FROM _seed_campaigns);
  GET DIAGNOSTICS v_posts = ROW_COUNT;

  DELETE FROM public.tenant_marketing_assets
  WHERE tenant_id = v_tenant AND campaign_id IN (SELECT id FROM _seed_campaigns);
  GET DIAGNOSTICS v_assets = ROW_COUNT;

  DELETE FROM public.marketing_campaigns
  WHERE id IN (SELECT id FROM _seed_campaigns);
  GET DIAGNOSTICS v_campaigns = ROW_COUNT;

  RAISE NOTICE 'seed cleanup: % posts, % assets, % campaigns', v_posts, v_assets, v_campaigns;
END $$;