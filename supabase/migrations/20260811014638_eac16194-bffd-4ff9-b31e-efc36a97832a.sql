-- =====================================================================
-- Structural pending_review ceiling.
-- Enforced by triggers (not RLS) because the marketing runner writes with
-- the service role, which bypasses RLS entirely. Triggers always fire.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_agent_actor()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw text;
  claims jsonb;
BEGIN
  -- Direct database roles (migrations, ops SQL) are not API actors.
  IF current_user NOT IN ('anon', 'authenticated', 'service_role') THEN
    RETURN false;
  END IF;

  BEGIN
    raw := nullif(current_setting('request.jwt.claims', true), '');
  EXCEPTION WHEN others THEN
    raw := NULL;
  END;

  -- No end-user identity at all => service-role / runner-token path.
  IF raw IS NULL THEN
    RETURN true;
  END IF;

  BEGIN
    claims := raw::jsonb;
  EXCEPTION WHEN others THEN
    RETURN true;
  END;

  IF (claims->>'sub') IS NULL THEN
    RETURN true;
  END IF;

  -- OAuth client-issued (MCP) tokens carry a client_id claim; a human
  -- dashboard session token never does. The claim is inside the signed
  -- token, so an agent cannot drop it without the token being rejected.
  IF (claims->>'client_id') IS NOT NULL THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_agent_actor() TO authenticated, anon, service_role;

-- ---------------------------------------------------------------- posts
CREATE OR REPLACE FUNCTION public.enforce_review_ceiling_scheduled_posts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gated constant text[] := ARRAY['draft', 'pending_review', 'rejected'];
BEGIN
  IF NOT public.is_agent_actor() THEN
    RETURN NEW;
  END IF;

  IF NEW.status = ANY(gated) THEN
    RETURN NEW;
  END IF;

  -- Already past the gate because a human approved it: the dispatcher may
  -- carry it forward (pending -> published / failed).
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT NULL AND NOT (OLD.status = ANY(gated)) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'review ceiling: agent-authored writes cannot set scheduled_posts.status to "%" (allowed: draft, pending_review, rejected)',
    NEW.status
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_review_ceiling_scheduled_posts ON public.scheduled_posts;
CREATE TRIGGER trg_review_ceiling_scheduled_posts
BEFORE INSERT OR UPDATE ON public.scheduled_posts
FOR EACH ROW EXECUTE FUNCTION public.enforce_review_ceiling_scheduled_posts();

-- ------------------------------------------------------------ campaigns
CREATE OR REPLACE FUNCTION public.enforce_review_ceiling_campaigns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gated constant text[] := ARRAY['draft', 'pending_review', 'rejected'];
BEGIN
  IF NOT public.is_agent_actor() THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_published, false)
     AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.is_published, false)) THEN
    RAISE EXCEPTION
      'review ceiling: agent-authored writes cannot publish marketing_campaigns'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (NEW.status = ANY(gated)) THEN
    IF TG_OP = 'UPDATE' AND OLD.status IS NOT NULL AND NOT (OLD.status = ANY(gated)) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION
      'review ceiling: agent-authored writes cannot set marketing_campaigns.status to "%" (allowed: draft, pending_review, rejected)',
      NEW.status
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_ceiling_campaigns ON public.marketing_campaigns;
CREATE TRIGGER trg_review_ceiling_campaigns
BEFORE INSERT OR UPDATE ON public.marketing_campaigns
FOR EACH ROW EXECUTE FUNCTION public.enforce_review_ceiling_campaigns();

-- --------------------------------------------------------------- assets
CREATE OR REPLACE FUNCTION public.enforce_review_ceiling_assets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_agent_actor() THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_published, false)
     AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.is_published, false)) THEN
    RAISE EXCEPTION
      'review ceiling: agent-authored writes cannot publish tenant_marketing_assets'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_ceiling_assets ON public.tenant_marketing_assets;
CREATE TRIGGER trg_review_ceiling_assets
BEFORE INSERT OR UPDATE ON public.tenant_marketing_assets
FOR EACH ROW EXECUTE FUNCTION public.enforce_review_ceiling_assets();