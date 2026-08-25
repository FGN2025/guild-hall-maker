ALTER TABLE public.tournaments ADD COLUMN featured_start_at timestamptz, ADD COLUMN featured_end_at timestamptz;
ALTER TABLE public.challenges ADD COLUMN featured_start_at timestamptz, ADD COLUMN featured_end_at timestamptz;
ALTER TABLE public.quests ADD COLUMN featured_start_at timestamptz, ADD COLUMN featured_end_at timestamptz;

UPDATE public.tournaments SET featured_start_at = now() WHERE is_featured = true AND featured_start_at IS NULL;
UPDATE public.challenges SET featured_start_at = now() WHERE is_featured = true AND featured_start_at IS NULL;
UPDATE public.quests SET featured_start_at = now() WHERE is_featured = true AND featured_start_at IS NULL;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_featured_window_order CHECK (featured_end_at IS NULL OR featured_start_at IS NULL OR featured_end_at > featured_start_at),
  ADD CONSTRAINT tournaments_featured_requires_start CHECK (NOT (is_featured AND featured_start_at IS NULL));

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_featured_window_order CHECK (featured_end_at IS NULL OR featured_start_at IS NULL OR featured_end_at > featured_start_at),
  ADD CONSTRAINT challenges_featured_requires_start CHECK (NOT (is_featured AND featured_start_at IS NULL));

ALTER TABLE public.quests
  ADD CONSTRAINT quests_featured_window_order CHECK (featured_end_at IS NULL OR featured_start_at IS NULL OR featured_end_at > featured_start_at),
  ADD CONSTRAINT quests_featured_requires_start CHECK (NOT (is_featured AND featured_start_at IS NULL));