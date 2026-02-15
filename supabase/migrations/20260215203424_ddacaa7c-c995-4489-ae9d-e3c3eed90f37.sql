
-- Create games table
CREATE TABLE public.games (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  category text NOT NULL DEFAULT 'General',
  cover_image_url text,
  guide_content text,
  platform_tags text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Anyone can read active games
CREATE POLICY "Anyone can read active games"
ON public.games FOR SELECT
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage games"
ON public.games FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
