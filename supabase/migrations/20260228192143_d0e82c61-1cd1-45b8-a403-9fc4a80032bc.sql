
ALTER TABLE public.tournaments
  ADD COLUMN points_first integer NOT NULL DEFAULT 10,
  ADD COLUMN points_second integer NOT NULL DEFAULT 5,
  ADD COLUMN points_third integer NOT NULL DEFAULT 3,
  ADD COLUMN points_participation integer NOT NULL DEFAULT 2;

ALTER TABLE public.challenges
  ADD COLUMN points_first integer NOT NULL DEFAULT 10,
  ADD COLUMN points_second integer NOT NULL DEFAULT 5,
  ADD COLUMN points_third integer NOT NULL DEFAULT 3,
  ADD COLUMN points_participation integer NOT NULL DEFAULT 2;
