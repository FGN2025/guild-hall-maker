ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS skill_tags text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_challenges_skill_tags
  ON public.challenges USING GIN (skill_tags);