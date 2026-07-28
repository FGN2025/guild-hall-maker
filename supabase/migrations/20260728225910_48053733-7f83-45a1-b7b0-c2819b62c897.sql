ALTER TABLE public.tenant_marketing_assets ADD COLUMN IF NOT EXISTS feedback_note TEXT;

UPDATE public.tenant_marketing_assets
SET feedback_note = NULLIF(regexp_replace(notes, '^\[Rejected\]\s*', ''), '')
WHERE feedback_note IS NULL
  AND notes IS NOT NULL
  AND notes LIKE '[Rejected]%';