
-- Create enum for trigger conditions
CREATE TYPE public.discord_role_trigger AS ENUM ('on_link', 'on_achievement', 'on_rank', 'on_tournament_win', 'manual');

-- Create discord_role_mappings table
CREATE TABLE public.discord_role_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_role_id TEXT NOT NULL,
  discord_role_name TEXT NOT NULL,
  trigger_condition public.discord_role_trigger NOT NULL DEFAULT 'on_link',
  condition_value TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_role_mappings ENABLE ROW LEVEL SECURITY;

-- Admin-only read
CREATE POLICY "Admins can read discord_role_mappings"
  ON public.discord_role_mappings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only insert
CREATE POLICY "Admins can insert discord_role_mappings"
  ON public.discord_role_mappings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin-only update
CREATE POLICY "Admins can update discord_role_mappings"
  ON public.discord_role_mappings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only delete
CREATE POLICY "Admins can delete discord_role_mappings"
  ON public.discord_role_mappings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
