ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS academy_next_step_url text DEFAULT NULL;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS academy_next_step_label text DEFAULT NULL;
ALTER TABLE public.challenge_completions ADD COLUMN IF NOT EXISTS academy_next_step jsonb DEFAULT NULL;