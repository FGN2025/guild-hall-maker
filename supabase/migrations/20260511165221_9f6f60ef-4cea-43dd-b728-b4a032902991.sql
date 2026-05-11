ALTER TABLE public.challenge_enrollments
  ADD COLUMN IF NOT EXISTS external_attempt_id uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_enrollments_external_attempt_id
  ON public.challenge_enrollments(external_attempt_id);