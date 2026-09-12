-- Store the shared dispatch secret in the vault (same value as the ECOSYSTEM_DISPATCH_SECRET edge-function secret)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'ecosystem_dispatch_secret') THEN
    PERFORM vault.create_secret('9249b35c637e387c82b17a2c4a58130ce7dd9ad67cc0d21ceb4a95e26bf2cf93', 'ecosystem_dispatch_secret');
  END IF;
END $$;

-- Trigger function: emit tenant.marketing.* events to the ecosystem webhook dispatcher.
-- Mirrors the email_queue_wake pattern: net.http_post + vault-stored secret, failures
-- swallowed as warnings so a webhook outage can never roll back a marketing write.
CREATE OR REPLACE FUNCTION public.dispatch_marketing_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_type text;
  _payload jsonb;
  _secret text;
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.agent_source IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    _event_type := 'tenant.marketing.created';
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    _event_type := 'tenant.marketing.status_changed';
  ELSE
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'marketing_campaigns' THEN
    _payload := jsonb_build_object(
      'kind', 'campaign',
      'id', NEW.id,
      'tenant_id', NEW.tenant_id,
      'title', NEW.title,
      'status', NEW.status,
      'agent_source', NEW.agent_source,
      'created_at', NEW.created_at
    );
  ELSE
    _payload := jsonb_build_object(
      'kind', 'asset',
      'id', NEW.id,
      'tenant_id', NEW.tenant_id,
      'label', COALESCE(NEW.label, NEW.file_name),
      'agent_source', NEW.agent_source,
      'created_at', NEW.created_at
    );
  END IF;

  SELECT decrypted_secret INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = 'ecosystem_dispatch_secret';

  IF _secret IS NULL THEN
    RAISE WARNING 'dispatch_marketing_webhook: vault secret ecosystem_dispatch_secret missing';
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/ecosystem-webhook-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _secret
      ),
      body := jsonb_build_object(
        'event_type', _event_type,
        'tenant_id', NEW.tenant_id,
        'payload', _payload
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatch_marketing_webhook: dispatch failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER marketing_campaigns_webhook
  AFTER INSERT OR UPDATE OF status ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_marketing_webhook();

CREATE TRIGGER tenant_marketing_assets_webhook
  AFTER INSERT ON public.tenant_marketing_assets
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_marketing_webhook();