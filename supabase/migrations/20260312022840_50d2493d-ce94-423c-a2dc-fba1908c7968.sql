ALTER TABLE public.tenant_events
  ADD COLUMN IF NOT EXISTS prize_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS prize_id uuid,
  ADD COLUMN IF NOT EXISTS points_participation integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS discord_role_id text,
  ADD COLUMN IF NOT EXISTS prize_pct_first integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS prize_pct_second integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS prize_pct_third integer DEFAULT 20;