
-- ============================================================
-- Phase 2 · Checkpoint 1 prerequisite tables
-- ============================================================

-- 1. agent_runs: tracks each agent invocation
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  launched_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT 'marketing_agent',
  prompt_version INTEGER,
  mode TEXT,
  archetype TEXT,
  anchor TEXT,
  instruction TEXT,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','completed','failed','killed','timed_out')),
  turn_cap INTEGER NOT NULL DEFAULT 40,
  turns_used INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  error_message TEXT,
  created_row_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_tenant_status ON public.agent_runs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_launched_by ON public.agent_runs(launched_by);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON public.agent_runs(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

-- Tenant admins & managers can view runs for their tenant; launcher can view their own.
CREATE POLICY "agent_runs_select_tenant_admins" ON public.agent_runs
  FOR SELECT TO authenticated
  USING (
    launched_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tenant_admins ta
      WHERE ta.tenant_id = agent_runs.tenant_id
        AND ta.user_id = auth.uid()
        AND ta.role IN ('admin','manager')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Only the launcher (and service_role) writes rows; UI insert is blocked, the edge function uses service_role.
CREATE POLICY "agent_runs_insert_self" ON public.agent_runs
  FOR INSERT TO authenticated
  WITH CHECK (launched_by = auth.uid());

CREATE POLICY "agent_runs_update_self_or_admin" ON public.agent_runs
  FOR UPDATE TO authenticated
  USING (
    launched_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_agent_runs_updated_at
  BEFORE UPDATE ON public.agent_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. agent_run_limits: per-tenant overrides on top of defaults
CREATE TABLE IF NOT EXISTS public.agent_run_limits (
  tenant_id UUID NOT NULL PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  daily_limit INTEGER NOT NULL DEFAULT 2,
  monthly_limit INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agent_run_limits TO authenticated;
GRANT ALL ON public.agent_run_limits TO service_role;

ALTER TABLE public.agent_run_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_run_limits_select_tenant_admins" ON public.agent_run_limits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_admins ta
      WHERE ta.tenant_id = agent_run_limits.tenant_id
        AND ta.user_id = auth.uid()
        AND ta.role IN ('admin','manager')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "agent_run_limits_write_platform_admin" ON public.agent_run_limits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_agent_run_limits_updated_at
  BEFORE UPDATE ON public.agent_run_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Kill switch row in app_settings
INSERT INTO public.app_settings (key, value, description)
VALUES ('agent_launches_enabled', 'true', 'Global kill switch for tenant agent launches')
ON CONFLICT (key) DO NOTHING;

-- 4. Extend notifications category domain (allowed values are string-based; no CHECK constraint change needed).
-- The two new categories 'agent_run_complete' and 'agent_run_failed' are already accepted by the
-- existing schema (category TEXT column is free-form and consumed by client-side dispatch).

COMMENT ON TABLE public.agent_runs IS 'Phase 2: Tracks individual invocations of the marketing agent for cost, guardrail, and audit purposes.';
COMMENT ON TABLE public.agent_run_limits IS 'Phase 2: Per-tenant override of default daily (2) and monthly (10) agent run limits.';
