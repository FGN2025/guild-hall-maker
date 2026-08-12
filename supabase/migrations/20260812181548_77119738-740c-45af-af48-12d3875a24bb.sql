-- 1. Non-dispatchable default + explicit vocabulary
ALTER TABLE public.scheduled_posts ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_status_check;
ALTER TABLE public.scheduled_posts ADD CONSTRAINT scheduled_posts_status_check
  CHECK (status = ANY (ARRAY[
    'draft',            -- authored, not submitted; never dispatched
    'pending_review',   -- submitted for human review; never dispatched
    'rejected',         -- reviewer refused; never dispatched
    'pending',          -- HUMAN-APPROVED and dispatchable (the only selector value)
    'published',        -- terminal success
    'failed',           -- terminal failure
    'cancelled'         -- terminal, withdrawn
  ]));

-- 2. Approval provenance
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS approved_by uuid;

CREATE OR REPLACE FUNCTION public.stamp_scheduled_post_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending') THEN
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
  ELSIF NEW.status = ANY (ARRAY['draft','pending_review','rejected']) THEN
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_scheduled_post_approval ON public.scheduled_posts;
CREATE TRIGGER trg_stamp_scheduled_post_approval
BEFORE INSERT OR UPDATE ON public.scheduled_posts
FOR EACH ROW EXECUTE FUNCTION public.stamp_scheduled_post_approval();

-- 3. Overdue stamp resets when the row moves to a future window
CREATE OR REPLACE FUNCTION public.reset_scheduled_post_overdue()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
     AND NEW.scheduled_at > now() THEN
    NEW.overdue_notified_at := NULL;
    NEW.undeliverable_notified_at := NULL;
    NEW.undeliverable_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_scheduled_post_overdue ON public.scheduled_posts;
CREATE TRIGGER trg_reset_scheduled_post_overdue
BEFORE UPDATE ON public.scheduled_posts
FOR EACH ROW EXECUTE FUNCTION public.reset_scheduled_post_overdue();

-- 4. Ceiling on EVERY insert path, not just the agent's
CREATE OR REPLACE FUNCTION public.enforce_review_ceiling_scheduled_posts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  gated constant text[] := ARRAY['draft', 'pending_review', 'rejected'];
BEGIN
  -- Universal insert ceiling: nothing may be born dispatchable or terminal.
  IF TG_OP = 'INSERT' AND NOT (NEW.status = ANY(gated)) THEN
    RAISE EXCEPTION
      'review ceiling: scheduled_posts may only be inserted as draft, pending_review or rejected (got "%"). Approval is an UPDATE performed by a human reviewer.',
      NEW.status
      USING ERRCODE = '42501';
  END IF;

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