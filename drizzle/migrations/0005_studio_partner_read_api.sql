-- Partner (FGN Studio) read API: durable keys, short-lived tokens, catalog revisions

CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  capabilities text[] NOT NULL DEFAULT ARRAY['catalog:read']::text[],
  include_inactive boolean NOT NULL DEFAULT true,
  rate_limit_per_minute integer NOT NULL DEFAULT 120,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid NOT NULL REFERENCES public.partner_api_keys(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_access_tokens_expiry ON public.partner_access_tokens (expires_at);

CREATE TABLE IF NOT EXISTS public.partner_request_counters (
  key_id uuid NOT NULL REFERENCES public.partner_api_keys(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key_id, window_start)
);

CREATE TABLE IF NOT EXISTS public.catalog_revisions (
  scope_key text PRIMARY KEY,
  revision bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.partner_api_keys TO service_role;
GRANT ALL ON public.partner_access_tokens TO service_role;
GRANT ALL ON public.partner_request_counters TO service_role;
GRANT ALL ON public.catalog_revisions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_api_keys TO authenticated;
GRANT SELECT ON public.catalog_revisions TO authenticated;

ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_request_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage partner keys" ON public.partner_api_keys;
CREATE POLICY "Admins manage partner keys" ON public.partner_api_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff read catalog revisions" ON public.catalog_revisions;
CREATE POLICY "Staff read catalog revisions" ON public.catalog_revisions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- No policies on partner_access_tokens / partner_request_counters: service_role only.

-- Revision bumping: covers INSERT, UPDATE and DELETE
CREATE OR REPLACE FUNCTION public.bump_catalog_revision(p_scope text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.catalog_revisions (scope_key, revision, updated_at)
  VALUES (p_scope, 1, now())
  ON CONFLICT (scope_key) DO UPDATE
    SET revision = public.catalog_revisions.revision + 1,
        updated_at = now();
$$;

CREATE OR REPLACE FUNCTION public.trg_bump_catalog_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game uuid;
  v_challenge uuid;
BEGIN
  IF TG_TABLE_NAME = 'challenges' THEN
    v_game := COALESCE(NEW.game_id, OLD.game_id);
  ELSIF TG_TABLE_NAME = 'simulation_activities' THEN
    v_game := COALESCE(NEW.game_id, OLD.game_id);
  ELSIF TG_TABLE_NAME = 'challenge_tasks' THEN
    v_challenge := COALESCE(NEW.challenge_id, OLD.challenge_id);
    SELECT c.game_id INTO v_game FROM public.challenges c WHERE c.id = v_challenge;
  ELSIF TG_TABLE_NAME = 'simulation_activity_challenges' THEN
    v_challenge := COALESCE(NEW.challenge_id, OLD.challenge_id);
    SELECT c.game_id INTO v_game FROM public.challenges c WHERE c.id = v_challenge;
  END IF;

  PERFORM public.bump_catalog_revision('global');
  IF v_game IS NOT NULL THEN
    PERFORM public.bump_catalog_revision('game:' || v_game::text);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_catalog_rev_challenges ON public.challenges;
CREATE TRIGGER trg_catalog_rev_challenges
  AFTER INSERT OR UPDATE OR DELETE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.trg_bump_catalog_revision();

DROP TRIGGER IF EXISTS trg_catalog_rev_tasks ON public.challenge_tasks;
CREATE TRIGGER trg_catalog_rev_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.challenge_tasks
  FOR EACH ROW EXECUTE FUNCTION public.trg_bump_catalog_revision();

DROP TRIGGER IF EXISTS trg_catalog_rev_activities ON public.simulation_activities;
CREATE TRIGGER trg_catalog_rev_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.simulation_activities
  FOR EACH ROW EXECUTE FUNCTION public.trg_bump_catalog_revision();

DROP TRIGGER IF EXISTS trg_catalog_rev_mappings ON public.simulation_activity_challenges;
CREATE TRIGGER trg_catalog_rev_mappings
  AFTER INSERT OR UPDATE OR DELETE ON public.simulation_activity_challenges
  FOR EACH ROW EXECUTE FUNCTION public.trg_bump_catalog_revision();

-- Seed the global revision and a row per game that has catalog content
INSERT INTO public.catalog_revisions (scope_key, revision)
VALUES ('global', 1)
ON CONFLICT (scope_key) DO NOTHING;

INSERT INTO public.catalog_revisions (scope_key, revision)
SELECT DISTINCT 'game:' || g.id::text, 1 FROM public.games g
ON CONFLICT (scope_key) DO NOTHING;

-- Approved CORS origins for the partner API
INSERT INTO public.app_settings (key, value, description)
VALUES ('studio_allowed_origins', '', 'Comma-separated list of origins allowed to call the studio-api partner read API from a browser.')
ON CONFLICT (key) DO NOTHING;