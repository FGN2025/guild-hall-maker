-- Add game_id to seasons table
ALTER TABLE public.seasons ADD COLUMN game_id uuid REFERENCES public.games(id) ON DELETE SET NULL;

-- Add season_id to challenges table
ALTER TABLE public.challenges ADD COLUMN season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL;

-- Add season_id to tournaments table
ALTER TABLE public.tournaments ADD COLUMN season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL;