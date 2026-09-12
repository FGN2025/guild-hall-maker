-- 1) tenants: keep public directory data readable but hide contact_email from anonymous visitors
REVOKE SELECT ON public.tenants FROM anon;
GRANT SELECT (id, name, slug, logo_url, status, created_at, updated_at, primary_color, accent_color, require_subscriber_validation, onboarding_completed, timezone, plan_tier, marketing_seed_density, parent_tenant_id) ON public.tenants TO anon;

-- 2) email infrastructure tables: service_role only, no Data API access for anon/authenticated
REVOKE ALL ON public.email_send_log FROM anon, authenticated;
REVOKE ALL ON public.suppressed_emails FROM anon, authenticated;
REVOKE ALL ON public.email_unsubscribe_tokens FROM anon, authenticated;
REVOKE ALL ON public.email_send_state FROM anon, authenticated;
GRANT ALL ON public.email_send_log TO service_role;
GRANT ALL ON public.suppressed_emails TO service_role;
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;
GRANT ALL ON public.email_send_state TO service_role;

-- 3) app_settings: defense-in-depth so a secret-looking key can never become public
--    even if it is accidentally added to the allowlist array.
DROP POLICY IF EXISTS "Public can read UI settings only" ON public.app_settings;
CREATE POLICY "Public can read UI settings only"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (
  key = ANY (ARRAY[
    'no_providers_message','featured_video_url','homepage_ticker_embed','hero_logo_url',
    'hero_stats_overrides','image_upload_limits','discord_client_id',
    'historical_player_count_offset','historical_tournament_count',
    'dispatch_kill_switch','dispatch_pause_started_at','dispatch_stale_grace_until',
    'dispatch_stale_grace_seconds','publish_quota_daily','publish_quota_monthly',
    'scheduled_post_stale_window_hours'
  ])
  AND key !~* '(secret|token|password|passwd|api[-_ ]?key|private[-_ ]?key|credential|access[-_ ]?key|webhook[-_ ]?url|signing)'
);