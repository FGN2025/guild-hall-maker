ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS points_participation_long integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_participation_short integer NOT NULL DEFAULT 0;