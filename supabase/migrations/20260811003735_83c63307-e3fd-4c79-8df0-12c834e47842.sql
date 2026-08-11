ALTER TABLE public.agent_runs
  ADD COLUMN IF NOT EXISTS range_start date,
  ADD COLUMN IF NOT EXISTS range_end date,
  ADD COLUMN IF NOT EXISTS include_kickoff boolean,
  ADD COLUMN IF NOT EXISTS scope jsonb,
  ADD COLUMN IF NOT EXISTS preflight jsonb,
  ADD COLUMN IF NOT EXISTS failure_kind text;