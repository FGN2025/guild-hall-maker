
-- Webhook registry
CREATE TABLE public.discord_channel_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  webhook_url text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discord_channel_webhooks TO authenticated;
GRANT ALL ON public.discord_channel_webhooks TO service_role;
ALTER TABLE public.discord_channel_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage discord webhooks"
  ON public.discord_channel_webhooks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_discord_webhooks_purpose_active
  ON public.discord_channel_webhooks (purpose, is_active);

CREATE TRIGGER trg_discord_webhooks_updated
  BEFORE UPDATE ON public.discord_channel_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Send log
CREATE TABLE public.discord_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES public.discord_channel_webhooks(id) ON DELETE SET NULL,
  tenant_id uuid,
  purpose text NOT NULL,
  status text NOT NULL,
  http_status integer,
  error_message text,
  payload_preview text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.discord_send_log TO authenticated;
GRANT ALL ON public.discord_send_log TO service_role;
ALTER TABLE public.discord_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view discord send log"
  ON public.discord_send_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_discord_send_log_created ON public.discord_send_log (created_at DESC);

-- Shared dispatcher
CREATE OR REPLACE FUNCTION public.dispatch_discord_message(
  _purpose text,
  _tenant_id uuid,
  _template text,
  _data jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Skip if no active webhook configured for this purpose
  IF NOT EXISTS (
    SELECT 1 FROM public.discord_channel_webhooks
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
$$;

-- Trigger: tournament published (insert with open/upcoming or status -> open)
CREATE OR REPLACE FUNCTION public.discord_on_tournament_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _should boolean := false;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IN ('open', 'upcoming') THEN
    _should := true;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'open' AND OLD.status IS DISTINCT FROM NEW.status THEN
    _should := true;
  END IF;

  IF _should THEN
    PERFORM public.dispatch_discord_message(
      'tournament_published',
      NULL,
      'tournament_published',
      jsonb_build_object(
        'name', NEW.name,
        'game', NEW.game,
        'format', NEW.format,
        'description', NEW.description,
        'start_date', NEW.start_date,
        'image_url', NEW.image_url,
        'url', 'https://fgn.gg/tournaments/' || NEW.id::text
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_discord_tournament_published
  AFTER INSERT OR UPDATE OF status ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.discord_on_tournament_published();

-- Trigger: tournament completed (post placements)
CREATE OR REPLACE FUNCTION public.discord_on_tournament_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _first text; _second text; _third text;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT p.display_name INTO _first
      FROM public.tournament_placements tp
      JOIN public.profiles p ON p.user_id = tp.user_id
     WHERE tp.tournament_id = NEW.id AND tp.place = 1 LIMIT 1;
    SELECT p.display_name INTO _second
      FROM public.tournament_placements tp
      JOIN public.profiles p ON p.user_id = tp.user_id
     WHERE tp.tournament_id = NEW.id AND tp.place = 2 LIMIT 1;
    SELECT p.display_name INTO _third
      FROM public.tournament_placements tp
      JOIN public.profiles p ON p.user_id = tp.user_id
     WHERE tp.tournament_id = NEW.id AND tp.place = 3 LIMIT 1;

    PERFORM public.dispatch_discord_message(
      'tournament_completed',
      NULL,
      'tournament_completed',
      jsonb_build_object(
        'name', NEW.name,
        'first_name', _first,
        'second_name', _second,
        'third_name', _third,
        'url', 'https://fgn.gg/tournaments/' || NEW.id::text
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_discord_tournament_completed
  AFTER UPDATE OF status ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.discord_on_tournament_completed();

-- Trigger: tenant event published
CREATE OR REPLACE FUNCTION public.discord_on_tenant_event_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _publish boolean := false;
BEGIN
  IF TG_OP = 'INSERT' AND COALESCE(NEW.is_public, false) = true THEN
    _publish := true;
  ELSIF TG_OP = 'UPDATE' AND COALESCE(NEW.is_public, false) = true
        AND COALESCE(OLD.is_public, false) = false THEN
    _publish := true;
  END IF;

  IF _publish THEN
    PERFORM public.dispatch_discord_message(
      'tenant_event_published',
      NEW.tenant_id,
      'tenant_event_published',
      jsonb_build_object(
        'name', NEW.name,
        'description', NEW.description,
        'start_date', NEW.start_date,
        'image_url', NEW.image_url,
        'url', 'https://fgn.gg/events/' || NEW.id::text
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_discord_tenant_event_published
  AFTER INSERT OR UPDATE OF is_public ON public.tenant_events
  FOR EACH ROW EXECUTE FUNCTION public.discord_on_tenant_event_published();
