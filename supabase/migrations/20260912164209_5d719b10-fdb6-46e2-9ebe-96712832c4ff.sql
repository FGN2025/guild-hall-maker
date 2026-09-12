alter table public.agent_runs
  add column if not exists error_detail text,
  add column if not exists continuation_budget integer,
  add column if not exists completeness_ratio numeric,
  add column if not exists is_complete boolean;