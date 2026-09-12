ALTER TABLE public.agent_runs
  ADD COLUMN IF NOT EXISTS build_id text,
  ADD COLUMN IF NOT EXISTS prompt_name text,
  ADD COLUMN IF NOT EXISTS turn_metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS continuation_metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS committed_rows integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.agent_runs.turn_metrics IS 'Array of {turn, ms, tools, at} — wall-clock duration of each model turn, for p95 slice-budget sizing.';
COMMENT ON COLUMN public.agent_runs.continuation_metrics IS 'Array of {continuation, committed, delta, at} — committed-row count and delta at each slice handoff.';
COMMENT ON COLUMN public.agent_runs.build_id IS 'Runner BUILD_ID that executed this run (attribution for completion-rate baselines).';
COMMENT ON COLUMN public.agent_runs.prompt_name IS 'Prompt name executed; prompt_version holds its version.';