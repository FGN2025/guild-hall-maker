-- Fire ecosystem-webhook-dispatch when tenant staff create marketing rows.
-- Agent-run drafts (agent_source set) and platform-level (tenant_id IS NULL) are skipped.
-- Placeholder webhook is inactive until Darcy pastes the Grok routine URL + sender key.

CREATE OR REPLACE FUNCTION public.dispatch_tenant_marketing_created(
  _tenant_id uuid,
  _actor_user_id uuid,
  _asset_type text,
  _asset_id uuid,
  _title text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tenant_name text;
  _actor_email text;
  _actor_display_name text;
  _role text;
  _service_key text;
  _payload jsonb;
BEGIN
  IF _tenant_id IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    SELECT t.name INTO _tenant_name
    FROM public.tenants t
    WHERE t.id = _tenant_id;
  EXCEPTION WHEN OTHERS THEN
    _tenant_name := NULL;
  END;

  BEGIN
    SELECT u.email INTO _actor_email
    FROM auth.users u
    WHERE u.id = _actor_user_id;
  EXCEPTION WHEN OTHERS THEN
    _actor_email := NULL;
  END;

  BEGIN
    SELECT p.display_name INTO _actor_display_name
    FROM public.profiles p
    WHERE p.user_id = _actor_user_id;
  EXCEPTION WHEN OTHERS THEN
    _actor_display_name := NULL;
  END;

  BEGIN
    SELECT ta.role INTO _role
    FROM public.tenant_admins ta
    WHERE ta.user_id = _actor_user_id
      AND ta.tenant_id = _tenant_id
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    _role := NULL;
  END;

  _payload := jsonb_build_object(
    'tenant_id', _tenant_id,
    'tenant_name', _tenant_name,
    'actor_user_id', _actor_user_id,
    'actor_email', _actor_email,
    'actor_display_name', _actor_display_name,
    'role', _role,
    'asset_type', _asset_type,
    'asset_id', _asset_id,
    'link', 'https://play.fgn.gg/tenant/marketing'
  );
  IF _title IS NOT NULL THEN
    _payload := _payload || jsonb_build_object('title', _title);
  END IF;

  BEGIN
    SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets
    WHERE name = 'email_queue_service_role_key'
    LIMIT 1;

    PERFORM net.http_post(
      url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/ecosystem-webhook-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(_service_key, '')
      ),
      body := jsonb_build_object(
        'event_type', 'tenant.marketing.created',
        'payload', _payload,
        'tenant_id', _tenant_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'tenant.marketing.created dispatch failed: %', SQLERRM;
  END;
END;
$function$;

REVOKE ALL ON FUNCTION public.dispatch_tenant_marketing_created(uuid, uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_dispatch_tenant_marketing_created_campaign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NULLIF(btrim(NEW.agent_source), '') IS NOT NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.dispatch_tenant_marketing_created(
      NEW.tenant_id,
      NEW.created_by,
      'campaign',
      NEW.id,
      NEW.title
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'tenant.marketing.created campaign trigger failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_dispatch_tenant_marketing_created_scheduled_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _title text;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NULLIF(btrim(NEW.agent_source), '') IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.caption IS NOT NULL THEN
    _title := left(NEW.caption, 500);
  END IF;

  BEGIN
    PERFORM public.dispatch_tenant_marketing_created(
      NEW.tenant_id,
      NEW.user_id,
      'scheduled_post',
      NEW.id,
      _title
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'tenant.marketing.created scheduled_post trigger failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_dispatch_tenant_marketing_created_asset()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NULLIF(btrim(NEW.agent_source), '') IS NOT NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.dispatch_tenant_marketing_created(
      NEW.tenant_id,
      NEW.created_by,
      'tenant_marketing_asset',
      NEW.id,
      NEW.label
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'tenant.marketing.created asset trigger failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS marketing_campaigns_ecosystem_created ON public.marketing_campaigns;
CREATE TRIGGER marketing_campaigns_ecosystem_created
  AFTER INSERT ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_dispatch_tenant_marketing_created_campaign();

DROP TRIGGER IF EXISTS scheduled_posts_ecosystem_created ON public.scheduled_posts;
CREATE TRIGGER scheduled_posts_ecosystem_created
  AFTER INSERT ON public.scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_dispatch_tenant_marketing_created_scheduled_post();

DROP TRIGGER IF EXISTS tenant_marketing_assets_ecosystem_created ON public.tenant_marketing_assets;
CREATE TRIGGER tenant_marketing_assets_ecosystem_created
  AFTER INSERT ON public.tenant_marketing_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_dispatch_tenant_marketing_created_asset();

INSERT INTO public.ecosystem_webhooks (event_type, target_app, webhook_url, secret_key, is_active)
SELECT 'tenant.marketing.created', 'grok_cos', '', '', false
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ecosystem_webhooks
  WHERE event_type = 'tenant.marketing.created'
    AND target_app = 'grok_cos'
);
