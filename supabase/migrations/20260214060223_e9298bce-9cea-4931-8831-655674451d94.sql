
-- Seasons table: tracks each competitive season
CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'upcoming')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Only service role manages seasons" ON public.seasons FOR INSERT WITH CHECK (false);
CREATE POLICY "Only service role updates seasons" ON public.seasons FOR UPDATE USING (false);

-- Season scores: running point tallies per player per season
CREATE TABLE public.season_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  tournaments_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (season_id, user_id)
);

ALTER TABLE public.season_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view season scores" ON public.season_scores FOR SELECT USING (true);
CREATE POLICY "Only service role manages scores" ON public.season_scores FOR INSERT WITH CHECK (false);
CREATE POLICY "Only service role updates scores" ON public.season_scores FOR UPDATE USING (false);

-- Season snapshots: frozen final rankings at season end
CREATE TABLE public.season_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  final_rank INTEGER NOT NULL,
  final_points INTEGER NOT NULL,
  tier TEXT NOT NULL DEFAULT 'none' CHECK (tier IN ('platinum', 'gold', 'silver', 'bronze', 'none')),
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (season_id, user_id)
);

ALTER TABLE public.season_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view snapshots" ON public.season_snapshots FOR SELECT USING (true);
CREATE POLICY "Only service role manages snapshots" ON public.season_snapshots FOR INSERT WITH CHECK (false);

-- Add updated_at trigger to season_scores
CREATE TRIGGER update_season_scores_updated_at
  BEFORE UPDATE ON public.season_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create initial season for current month
INSERT INTO public.seasons (name, start_date, end_date, status)
VALUES (
  'Season ' || to_char(now(), 'YYYY-MM'),
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month' - interval '1 second',
  'active'
);
