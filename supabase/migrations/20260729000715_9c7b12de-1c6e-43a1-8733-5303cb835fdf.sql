CREATE TABLE public.agent_mode_config (
  mode text PRIMARY KEY,
  label text NOT NULL,
  turn_cap integer NOT NULL DEFAULT 40,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_mode_config_turn_cap_chk CHECK (turn_cap >= 1 AND turn_cap <= 200)
);

GRANT SELECT ON public.agent_mode_config TO authenticated;
GRANT ALL ON public.agent_mode_config TO service_role;

ALTER TABLE public.agent_mode_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_mode_config_select_authenticated"
  ON public.agent_mode_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "agent_mode_config_write_platform_admin"
  ON public.agent_mode_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_agent_mode_config_updated_at
  BEFORE UPDATE ON public.agent_mode_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.agent_mode_config (mode, label, turn_cap) VALUES
  ('single_campaign', 'Single campaign', 40),
  ('weekly_slate', 'Weekly slate', 40),
  ('monthly_calendar_seed', 'Monthly calendar seed', 100)
ON CONFLICT (mode) DO NOTHING;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS marketing_seed_density text NOT NULL DEFAULT 'standard';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_marketing_seed_density_chk'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_marketing_seed_density_chk
      CHECK (marketing_seed_density IN ('light', 'standard', 'full'));
  END IF;
END $$;

ALTER TABLE public.agent_runs
  ADD COLUMN IF NOT EXISTS target_month text,
  ADD COLUMN IF NOT EXISTS seed_density text;