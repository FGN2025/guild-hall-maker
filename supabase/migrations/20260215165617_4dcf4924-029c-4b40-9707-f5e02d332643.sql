
-- Create managed_pages table
CREATE TABLE public.managed_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  supports_hero BOOLEAN NOT NULL DEFAULT true,
  supports_background BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.managed_pages ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can read managed pages"
  ON public.managed_pages FOR SELECT
  USING (true);

-- Admin-only write
CREATE POLICY "Admins can manage pages"
  ON public.managed_pages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed with existing pages
INSERT INTO public.managed_pages (slug, label, supports_hero, supports_background, display_order) VALUES
  ('dashboard',    'Dashboard',    true, true,  0),
  ('tournaments',  'Tournaments',  true, false, 1),
  ('leaderboard',  'Leaderboard',  true, true,  2),
  ('community',    'Community',    true, true,  3),
  ('achievements', 'Achievements', true, true,  4),
  ('season-stats', 'Season Stats', true, true,  5);
