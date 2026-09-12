-- Let signed-in staff read the dispatch control keys so the UI can show an
-- active kill switch / exhausted quota instead of a silent no-op.
-- These keys are operational flags, not secrets. Writes remain admin-only
-- (the existing "Admins can manage settings" ALL policy is unchanged).
DROP POLICY IF EXISTS "Public can read UI settings only" ON public.app_settings;

CREATE POLICY "Public can read UI settings only"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (
  key = ANY (ARRAY[
    'no_providers_message',
    'featured_video_url',
    'homepage_ticker_embed',
    'hero_logo_url',
    'hero_stats_overrides',
    'image_upload_limits',
    'discord_client_id',
    'historical_player_count_offset',
    'historical_tournament_count',
    'dispatch_kill_switch',
    'dispatch_pause_started_at',
    'dispatch_stale_grace_until',
    'dispatch_stale_grace_seconds',
    'publish_quota_daily',
    'publish_quota_monthly',
    'scheduled_post_stale_window_hours'
  ])
);