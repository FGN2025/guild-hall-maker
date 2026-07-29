ALTER TABLE public.agent_runs
  ADD COLUMN IF NOT EXISTS transcript jsonb,
  ADD COLUMN IF NOT EXISTS continuation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz;

UPDATE public.agent_runs
SET status = 'failed',
    error_message = COALESCE(error_message, 'stalled: runner terminated before completion'),
    finished_at = COALESCE(finished_at, updated_at)
WHERE status = 'running'
  AND updated_at < now() - interval '10 minutes';