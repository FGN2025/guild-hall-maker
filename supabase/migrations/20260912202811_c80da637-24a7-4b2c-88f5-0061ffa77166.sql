ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_retry_error text;

CREATE INDEX IF NOT EXISTS scheduled_posts_next_retry_idx
  ON public.scheduled_posts (next_retry_at)
  WHERE next_retry_at IS NOT NULL;