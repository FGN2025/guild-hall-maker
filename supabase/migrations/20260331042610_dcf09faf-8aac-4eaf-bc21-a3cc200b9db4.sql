ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.challenges
)
UPDATE public.challenges SET display_order = ranked.rn FROM ranked WHERE challenges.id = ranked.id;