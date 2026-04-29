ALTER TABLE public.prizes ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_prizes_archived_at ON public.prizes(archived_at);