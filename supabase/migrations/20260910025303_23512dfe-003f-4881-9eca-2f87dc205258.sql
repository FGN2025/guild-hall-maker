ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS runner_generation text;

COMMENT ON COLUMN public.agent_runs.runner_generation IS 'Code generation label for runs predating build_id stamping. Reporting key is coalesce(build_id, runner_generation).';

-- gen1: non-streaming model call, flat 60s model timeout, 200s slice budget.
UPDATE public.agent_runs
   SET runner_generation = 'gen1_nonstreaming_200s_slice'
 WHERE runner_generation IS NULL
   AND build_id IS NULL
   AND started_at < timestamptz '2026-08-05 01:00:00+00';

-- gen2: streaming model call with idle detection, 70s slice, flat 60 continuations.
UPDATE public.agent_runs
   SET runner_generation = 'gen2_streaming_70s_slice_60cont'
 WHERE runner_generation IS NULL
   AND build_id IS NULL
   AND started_at >= timestamptz '2026-08-05 01:00:00+00';