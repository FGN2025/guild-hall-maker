ALTER TABLE public.social_connections
  ADD COLUMN IF NOT EXISTS token_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS token_check_error text;