-- 1. Remove quarantined verification/test fan-out rows
DELETE FROM public.orphaned_notifications
WHERE category IN ('universal_asset_new')
   OR message ILIKE 'Verification:%';

-- 2. Retention job for notifications
CREATE OR REPLACE FUNCTION public.purge_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE is_read = true AND created_at < now() - interval '90 days';

  DELETE FROM public.notifications
  WHERE is_read = false AND created_at < now() - interval '180 days';
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_notifications() TO service_role;

SELECT cron.unschedule('purge-old-notifications')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-notifications');

SELECT cron.schedule(
  'purge-old-notifications',
  '20 4 * * *',
  $$SELECT public.purge_old_notifications();$$
);

-- Run once now
SELECT public.purge_old_notifications();