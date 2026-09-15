-- Merit connector (Stop 7, Scout Merit Builder):
-- 1. merit_connector_deliveries — idempotency ledger for inbound passport_entries deliveries.
-- 2. dispatch_merit_challenge_webhook() — mirrors dispatch_marketing_webhook(); emits
--    challenge.created / challenge.updated / challenge.deactivated to ecosystem-webhook-dispatch.

-- ============= 1. Delivery idempotency table =============
CREATE TABLE IF NOT EXISTS public.merit_connector_deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_id text not null unique,
  source_app text not null default 'scout_merit_builder',
  entries_count integer not null default 0,
  created_at timestamptz not null default now()
);

GRANT ALL ON public.merit_connector_deliveries TO service_role;
-- Edge function only; no client access (RLS enabled with no policies keeps anon/auth locked out).
ALTER TABLE public.merit_connector_deliveries ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'merit_connector_deliveries' AND policyname = 'service_role manages merit connector deliveries'
  ) THEN
    CREATE POLICY "service_role manages merit connector deliveries"
      ON public.merit_connector_deliveries
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS merit_connector_deliveries_created_idx
  ON public.merit_connector_deliveries (created_at);

-- ============= 2. Outbound challenge events =============
-- Reuses the vault-stored ecosystem_dispatch_secret created by 20260912210142
-- (guarded again for standalone idempotency).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'ecosystem_dispatch_secret') THEN
    RAISE EXCEPTION 'vault secret ecosystem_dispatch_secret missing; run migration 20260912210142 first';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_merit_challenge_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_type text;
  _secret text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _event_type := 'challenge.created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active AND NOT NEW.is_active THEN
      _event_type := 'challenge.deactivated';
    ELSE
      _event_type := 'challenge.updated';
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = 'ecosystem_dispatch_secret';

  IF _secret IS NULL THEN
    RAISE WARNING 'dispatch_merit_challenge_webhook: vault secret ecosystem_dispatch_secret missing';
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
        'payload', jsonb_build_object(
          'id', NEW.id,
          'name', NEW.name,
          'game_id', NEW.game_id,
          'difficulty', NEW.difficulty,
          'is_active', NEW.is_active,
          'updated_at', NEW.updated_at
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatch_merit_challenge_webhook: dispatch failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- One trigger per event surface; guarded CREATE keeps reruns idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.challenges'::regclass AND tgname = 'challenges_merit_webhook'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER challenges_merit_webhook
      AFTER INSERT OR UPDATE OF is_active, updated_at ON public.challenges
      FOR EACH ROW EXECUTE FUNCTION public.dispatch_merit_challenge_webhook();
  END IF;
END $$;