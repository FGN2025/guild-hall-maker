ALTER TABLE public.web_pages
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS web_pages_tenant_idempotency_key_unique
  ON public.web_pages (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.web_pages.idempotency_key IS
  'Stable agent retry key scoped to a tenant; repeated create calls return the existing draft.';