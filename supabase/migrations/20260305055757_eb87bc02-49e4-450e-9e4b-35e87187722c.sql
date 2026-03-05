
-- Migration A: Extend challenges table
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS requires_evidence boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_enrollments integer;
