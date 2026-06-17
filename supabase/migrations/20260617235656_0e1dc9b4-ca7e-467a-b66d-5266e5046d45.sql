
ALTER TABLE public.discord_send_log
  ADD COLUMN IF NOT EXISTS template TEXT,
  ADD COLUMN IF NOT EXISTS data JSONB;

ALTER TABLE public.scheduled_posts
  ALTER COLUMN connection_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS discord_purpose TEXT,
  ADD COLUMN IF NOT EXISTS discord_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
