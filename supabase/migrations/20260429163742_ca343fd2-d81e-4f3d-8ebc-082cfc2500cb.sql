-- Add archived_at column to tournaments for soft-delete / hide-from-player-view
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_tournaments_archived_at
  ON public.tournaments (archived_at);

-- Backfill: archive any tournament whose start_date is more than 7 days in the past
UPDATE public.tournaments
SET archived_at = now()
WHERE archived_at IS NULL
  AND start_date < (now() - interval '7 days');