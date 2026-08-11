-- The actor check must observe the CALLER's role. SECURITY DEFINER rewrites
-- current_user to the function owner, which made every caller look like a
-- direct database role and disabled the ceiling. These functions need no
-- elevated rights: they only read GUCs and raise.

CREATE OR REPLACE FUNCTION public.is_agent_actor()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  raw text;
  claims jsonb;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated', 'service_role') THEN
    RETURN false;
  END IF;

  BEGIN
    raw := nullif(current_setting('request.jwt.claims', true), '');
  EXCEPTION WHEN others THEN
    raw := NULL;
  END;

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

  IF (claims->>'client_id') IS NOT NULL THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_agent_actor() FROM anon;

CREATE OR REPLACE FUNCTION public.enforce_review_ceiling_scheduled_posts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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

  IF TG_OP = 'UPDATE' AND OLD.status IS NOT NULL AND NOT (OLD.status = ANY(gated)) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'review ceiling: agent-authored writes cannot set scheduled_posts.status to "%" (allowed: draft, pending_review, rejected)',
    NEW.status
    USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_review_ceiling_campaigns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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

CREATE OR REPLACE FUNCTION public.enforce_review_ceiling_assets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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