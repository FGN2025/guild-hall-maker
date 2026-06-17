
CREATE TABLE public.discord_channel_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  guild_id text,
  channel_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discord_channel_routes TO authenticated;
GRANT ALL ON public.discord_channel_routes TO service_role;

ALTER TABLE public.discord_channel_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage discord channel routes"
ON public.discord_channel_routes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_discord_channel_routes_purpose ON public.discord_channel_routes(purpose) WHERE is_active = true;
CREATE INDEX idx_discord_channel_routes_tenant ON public.discord_channel_routes(tenant_id);

CREATE TRIGGER trg_discord_channel_routes_updated_at
BEFORE UPDATE ON public.discord_channel_routes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update dispatcher to also fire when a bot route is configured
CREATE OR REPLACE FUNCTION public.dispatch_discord_message(_purpose text, _tenant_id uuid, _template text, _data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.discord_channel_webhooks
     WHERE purpose = _purpose AND is_active = true
       AND (tenant_id = _tenant_id OR tenant_id IS NULL)
  ) AND NOT EXISTS (
    SELECT 1 FROM public.discord_channel_routes
     WHERE purpose = _purpose AND is_active = true
       AND (tenant_id = _tenant_id OR tenant_id IS NULL)
  ) THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/discord-send-message',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
    body := jsonb_build_object(
      'purpose', _purpose,
      'tenant_id', _tenant_id,
      'template', _template,
      'data', _data
    )
  );
END;
$function$;

-- Add a route_id column to discord_send_log to identify bot vs webhook delivery
ALTER TABLE public.discord_send_log ADD COLUMN IF NOT EXISTS route_id uuid;
ALTER TABLE public.discord_send_log ADD COLUMN IF NOT EXISTS transport text;
