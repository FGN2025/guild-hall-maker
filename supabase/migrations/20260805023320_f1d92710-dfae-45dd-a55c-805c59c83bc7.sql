UPDATE public.agent_run_limits
SET daily_limit = 2, monthly_limit = 10, updated_at = now()
WHERE tenant_id = '41a2e493-079a-4a17-a3a9-aebdd5fe5f81';