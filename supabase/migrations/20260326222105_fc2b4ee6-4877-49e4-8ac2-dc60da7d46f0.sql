ALTER TABLE public.challenge_completions
  ADD COLUMN IF NOT EXISTS academy_synced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS academy_synced_at timestamptz;