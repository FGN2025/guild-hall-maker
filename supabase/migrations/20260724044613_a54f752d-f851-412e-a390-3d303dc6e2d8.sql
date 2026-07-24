
-- 1. Extend notifications table with tenant + category metadata
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS related_kind text,
  ADD COLUMN IF NOT EXISTS related_id uuid,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS notifications_tenant_created_idx
  ON public.notifications (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, is_read);

-- Tenant admins/managers can read notifications scoped to their tenant
DROP POLICY IF EXISTS "Tenant admins can view tenant notifications" ON public.notifications;
CREATE POLICY "Tenant admins can view tenant notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.tenant_admins ta
    WHERE ta.tenant_id = notifications.tenant_id
      AND ta.user_id = auth.uid()
      AND ta.role IN ('admin', 'manager', 'marketing')
  )
);

-- 2. Orphaned notifications table (platform admin visibility)
CREATE TABLE IF NOT EXISTS public.orphaned_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  category text NOT NULL,
  related_kind text,
  related_id uuid,
  message text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orphaned_notifications TO authenticated;
GRANT ALL ON public.orphaned_notifications TO service_role;
ALTER TABLE public.orphaned_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view orphaned notifications" ON public.orphaned_notifications;
CREATE POLICY "Platform admins can view orphaned notifications"
ON public.orphaned_notifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Digest batching state table
CREATE TABLE IF NOT EXISTS public.marketing_notification_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_source text NOT NULL,
  category text NOT NULL,
  pending_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_flush_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_source, category)
);
GRANT SELECT ON public.marketing_notification_state TO authenticated;
GRANT ALL ON public.marketing_notification_state TO service_role;
ALTER TABLE public.marketing_notification_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view digest state" ON public.marketing_notification_state;
CREATE POLICY "Platform admins can view digest state"
ON public.marketing_notification_state
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Extend scheduled_posts with observability flags
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS conflict_flagged_at timestamptz,
  ADD COLUMN IF NOT EXISTS conflict_details jsonb,
  ADD COLUMN IF NOT EXISTS undeliverable_reason text,
  ADD COLUMN IF NOT EXISTS undeliverable_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS overdue_notified_at timestamptz;

-- 5. Recipient resolution helper
CREATE OR REPLACE FUNCTION public.get_marketing_notification_recipients(
  _tenant_id uuid,
  _category text
)
RETURNS TABLE (user_id uuid, email text, channels text[])
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH members AS (
    SELECT ta.user_id, ta.role
    FROM public.tenant_admins ta
    WHERE ta.tenant_id = _tenant_id
      AND ta.role IN ('admin', 'manager', 'marketing')
  ),
  prefs AS (
    SELECT np.user_id, np.email_enabled
    FROM public.notification_preferences np
    WHERE np.notification_type = _category
  )
  SELECT
    m.user_id,
    u.email::text,
    CASE
      WHEN m.role = 'marketing' THEN ARRAY['in_app']
      WHEN COALESCE(p.email_enabled, true) THEN ARRAY['in_app','email']
      ELSE ARRAY['in_app']
    END AS channels
  FROM members m
  JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN prefs p ON p.user_id = m.user_id;
END;
$$;

-- 6. Enqueue helper: writes in-app rows + queues immediate emails or batches digests
CREATE OR REPLACE FUNCTION public.enqueue_marketing_notification(
  _tenant_id uuid,
  _category text,
  _related_kind text,
  _related_id uuid,
  _title text,
  _message text,
  _link text,
  _agent_source text,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec RECORD;
  _tenant_name text;
  _recipient_count int := 0;
  _is_immediate boolean := _category IN ('dispatch_error','undeliverable','schedule_conflict','overdue');
  _severity text := CASE WHEN _category IN ('dispatch_error','undeliverable','overdue') THEN 'warning' ELSE 'info' END;
BEGIN
  SELECT name INTO _tenant_name FROM public.tenants WHERE id = _tenant_id;

  FOR _rec IN
    SELECT * FROM public.get_marketing_notification_recipients(_tenant_id, _category)
  LOOP
    _recipient_count := _recipient_count + 1;
    -- In-app row (always)
    INSERT INTO public.notifications (user_id, tenant_id, type, title, message, link, category, related_kind, related_id)
    VALUES (_rec.user_id, _tenant_id, _severity, _title, _message, _link, _category, _related_kind, _related_id);

    -- Email routing
    IF 'email' = ANY(_rec.channels) AND _rec.email IS NOT NULL THEN
      IF _is_immediate THEN
        PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
          'templateName', 'marketing-alert',
          'recipientEmail', _rec.email,
          'idempotencyKey', concat('mkt-', _category, '-', _related_id, '-', _rec.user_id),
          'templateData', jsonb_build_object(
            'tenantName', COALESCE(_tenant_name, 'your tenant'),
            'category', _category,
            'title', _title,
            'message', _message,
            'link', _link
          )
        ));
      ELSE
        -- Batch: append to digest cursor
        INSERT INTO public.marketing_notification_state (tenant_id, agent_source, category, pending_ids, next_flush_at)
        VALUES (
          _tenant_id,
          COALESCE(_agent_source, 'unknown'),
          _category,
          jsonb_build_array(jsonb_build_object('kind', _related_kind, 'id', _related_id, 'title', _title, 'link', _link, 'user_id', _rec.user_id)),
          now() + interval '10 minutes'
        )
        ON CONFLICT (tenant_id, agent_source, category) DO UPDATE
          SET pending_ids = public.marketing_notification_state.pending_ids ||
                            jsonb_build_array(jsonb_build_object('kind', _related_kind, 'id', _related_id, 'title', _title, 'link', _link, 'user_id', _rec.user_id)),
              next_flush_at = now() + interval '10 minutes',
              updated_at = now();
      END IF;
    END IF;
  END LOOP;

  -- Orphan capture: no admins or managers at all
  IF _recipient_count = 0 THEN
    INSERT INTO public.orphaned_notifications (tenant_id, category, related_kind, related_id, message, payload)
    VALUES (_tenant_id, _category, _related_kind, _related_id, _title || ' — ' || _message, _payload);
  END IF;
END;
$$;

-- 7. Schedule conflict helper
CREATE OR REPLACE FUNCTION public.check_schedule_conflict(
  _tenant_id uuid,
  _platform text,
  _scheduled_at timestamptz,
  _exclude_id uuid,
  _window_seconds int DEFAULT 3600
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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
    AND sp.status IN ('pending', 'pending_review')
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

-- 8. Triggers

-- Campaigns: draft_new on insert with pending_review + agent_source
CREATE OR REPLACE FUNCTION public.trg_notify_campaign_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cat text;
  _content_changed boolean;
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.agent_source IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending_review' THEN
      PERFORM public.enqueue_marketing_notification(
        NEW.tenant_id, 'draft_new', 'campaign', NEW.id,
        'New agent campaign draft',
        COALESCE(NEW.title, 'Untitled') || ' is ready for review.',
        '/tenant/marketing?tab=agent',
        NEW.agent_source, jsonb_build_object('id', NEW.id)
      );
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF OLD.status = 'rejected' AND NEW.status = 'pending_review' THEN
    _cat := 'draft_resubmitted';
  ELSIF OLD.status = 'rejected' AND NEW.status = 'rejected' THEN
    -- Flag 1: content revised while still rejected
    _content_changed :=
      NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.social_copy IS DISTINCT FROM OLD.social_copy
      OR NEW.target_platforms IS DISTINCT FROM OLD.target_platforms
      OR NEW.source_event_id IS DISTINCT FROM OLD.source_event_id
      OR NEW.source_tournament_id IS DISTINCT FROM OLD.source_tournament_id;
    IF _content_changed THEN _cat := 'draft_resubmitted'; END IF;
  END IF;

  IF _cat IS NOT NULL THEN
    PERFORM public.enqueue_marketing_notification(
      NEW.tenant_id, _cat, 'campaign', NEW.id,
      'Agent revised a campaign',
      COALESCE(NEW.title, 'Untitled') || ' has been revised and is ready for re-review.',
      '/tenant/marketing?tab=agent',
      NEW.agent_source, jsonb_build_object('id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_campaigns_notify ON public.marketing_campaigns;
CREATE TRIGGER marketing_campaigns_notify
  AFTER INSERT OR UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_campaign_change();

-- Scheduled posts: draft_new / draft_resubmitted / dispatch_error
CREATE OR REPLACE FUNCTION public.trg_notify_scheduled_post_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending_review' AND NEW.agent_source IS NOT NULL THEN
      PERFORM public.enqueue_marketing_notification(
        NEW.tenant_id, 'draft_new', 'scheduled_post', NEW.id,
        'New agent scheduled post',
        'A new ' || NEW.platform || ' post is ready for review.',
        '/tenant/marketing?tab=agent',
        NEW.agent_source, jsonb_build_object('id', NEW.id, 'platform', NEW.platform)
      );
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'rejected' AND NEW.status = 'pending_review' AND NEW.agent_source IS NOT NULL THEN
    PERFORM public.enqueue_marketing_notification(
      NEW.tenant_id, 'draft_resubmitted', 'scheduled_post', NEW.id,
      'Agent revised a scheduled post',
      'A ' || NEW.platform || ' post has been revised and is ready for re-review.',
      '/tenant/marketing?tab=agent',
      NEW.agent_source, jsonb_build_object('id', NEW.id)
    );
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'failed' THEN
    PERFORM public.enqueue_marketing_notification(
      NEW.tenant_id, 'dispatch_error', 'scheduled_post', NEW.id,
      'Scheduled post failed to publish',
      COALESCE(NEW.error_message, 'Unknown error') || ' (' || NEW.platform || ')',
      '/tenant/marketing?tab=scheduled',
      NEW.agent_source, jsonb_build_object('id', NEW.id, 'error', NEW.error_message)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scheduled_posts_notify ON public.scheduled_posts;
CREATE TRIGGER scheduled_posts_notify
  AFTER INSERT OR UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_scheduled_post_change();

-- Tenant marketing assets: draft_new keyed on is_published + agent_source (Flag 3)
CREATE OR REPLACE FUNCTION public.trg_notify_tenant_asset_new()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.agent_source IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_published, false) = false THEN
    PERFORM public.enqueue_marketing_notification(
      NEW.tenant_id, 'draft_new', 'asset', NEW.id,
      'New agent asset attached',
      COALESCE(NEW.label, NEW.file_name) || ' is ready for review.',
      '/tenant/marketing?tab=agent',
      NEW.agent_source, jsonb_build_object('id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_marketing_assets_notify ON public.tenant_marketing_assets;
CREATE TRIGGER tenant_marketing_assets_notify
  AFTER INSERT ON public.tenant_marketing_assets
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_tenant_asset_new();
