ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT NULL;