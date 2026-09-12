-- Lapse guard (approved plan 2026-09-12): pre-deadline alerts + automatic lapse.
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS notified_t72_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_t24_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_t4_at timestamptz,
  ADD COLUMN IF NOT EXISTS lapsed_at timestamptz,
  ADD COLUMN IF NOT EXISTS lapsed boolean NOT NULL DEFAULT false;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS review_alert_hours integer[] NOT NULL DEFAULT '{72,24,4}';

CREATE INDEX IF NOT EXISTS scheduled_posts_review_deadline_idx
  ON public.scheduled_posts (scheduled_at)
  WHERE status = 'pending_review';