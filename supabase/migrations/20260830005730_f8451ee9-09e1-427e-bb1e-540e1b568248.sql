-- 1. De-arm any ambiguous legacy row: 'pending' with no approval stamp was never
--    dispatch-eligible; it becomes what it always was, an unreviewed draft.
UPDATE public.scheduled_posts
   SET status = 'pending_review'
 WHERE status = 'pending' AND approved_at IS NULL;

-- 2. Rename the armed state. Only rows that already carried an approval stamp
--    can reach 'approved'; eligibility is unchanged because the dispatcher
--    predicate still requires the stamp plus the time window.
UPDATE public.scheduled_posts
   SET status = 'approved'
 WHERE status = 'pending' AND approved_at IS NOT NULL;

-- 3. Vocabulary: 'pending' no longer exists.
ALTER TABLE public.scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_status_check;
ALTER TABLE public.scheduled_posts
  ADD CONSTRAINT scheduled_posts_status_check
  CHECK (status = ANY (ARRAY['draft','pending_review','rejected','approved','published','failed','cancelled']));

-- 4. Make disagreement impossible: approved implies an approval stamp.
ALTER TABLE public.scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_approved_requires_stamp;
ALTER TABLE public.scheduled_posts
  ADD CONSTRAINT scheduled_posts_approved_requires_stamp
  CHECK (status <> 'approved' OR approved_at IS NOT NULL);

-- 5. One canonical signal. Every surface (UI badge, count, tool response,
--    dispatcher) reads this column instead of re-deriving approval.
ALTER TABLE public.scheduled_posts DROP COLUMN IF EXISTS is_dispatch_approved;
ALTER TABLE public.scheduled_posts
  ADD COLUMN is_dispatch_approved boolean
  GENERATED ALWAYS AS (status = 'approved' AND approved_at IS NOT NULL) STORED;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_dispatch
  ON public.scheduled_posts (scheduled_at)
  WHERE is_dispatch_approved;

-- 6. Approval stamping follows the renamed state.
CREATE OR REPLACE FUNCTION public.stamp_scheduled_post_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
  ELSIF NEW.status = ANY (ARRAY['draft','pending_review','rejected']) THEN
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Conflict detection uses the renamed state.
CREATE OR REPLACE FUNCTION public.check_schedule_conflict(
  _tenant_id uuid,
  _platform text,
  _scheduled_at timestamptz,
  _exclude_id uuid DEFAULT NULL,
  _window_seconds integer DEFAULT 3600
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hits jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', sp.id,
    'scheduled_at', sp.scheduled_at,
    'platform', sp.platform,
    'status', sp.status
  ) ORDER BY sp.scheduled_at), '[]'::jsonb)
  INTO _hits
  FROM public.scheduled_posts sp
  WHERE sp.tenant_id = _tenant_id
    AND sp.platform = _platform
    AND sp.status IN ('approved', 'pending_review')
    AND (_exclude_id IS NULL OR sp.id <> _exclude_id)
    AND abs(extract(epoch from (sp.scheduled_at - _scheduled_at))) <= _window_seconds;

  IF jsonb_array_length(_hits) = 0 THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'flagged_at', now(),
    'window_minutes', _window_seconds / 60,
    'conflicts', _hits
  );
END;
$$;