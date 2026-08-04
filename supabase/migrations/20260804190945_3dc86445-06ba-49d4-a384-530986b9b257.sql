CREATE OR REPLACE FUNCTION public.fail_stalled_agent_runs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH stalled AS (
    UPDATE public.agent_runs
    SET status = 'failed',
        error_message = COALESCE(
          error_message,
          'watchdog: no progress for >5 minutes (last heartbeat ' ||
          COALESCE(to_char(COALESCE(heartbeat_at, started_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SSZ'), 'never') ||
          ', turns_used ' || COALESCE(turns_used, 0) || ')'
        ),
        finished_at = now(),
        updated_at = now()
    WHERE status = 'running'
      AND COALESCE(heartbeat_at, started_at) < now() - interval '5 minutes'
    RETURNING 1
  )
  SELECT count(*) INTO n FROM stalled;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.fail_stalled_agent_runs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_stalled_agent_runs() TO service_role;

SELECT cron.unschedule('fail-stalled-agent-runs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fail-stalled-agent-runs');

SELECT cron.schedule(
  'fail-stalled-agent-runs',
  '*/2 * * * *',
  $$SELECT public.fail_stalled_agent_runs();$$
);