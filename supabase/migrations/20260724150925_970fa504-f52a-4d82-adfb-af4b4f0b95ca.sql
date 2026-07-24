
-- 1. Extend marketing_assets with universal fields
ALTER TABLE public.marketing_assets
  ADD COLUMN IF NOT EXISTS is_universal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS universal_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS universal_published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS universal_title text,
  ADD COLUMN IF NOT EXISTS universal_campaign_context text,
  ADD COLUMN IF NOT EXISTS usage_notes text;

CREATE INDEX IF NOT EXISTS marketing_assets_universal_idx
  ON public.marketing_assets (is_universal, universal_published_at DESC)
  WHERE is_universal = true;

-- 2. RLS: only platform admin or marketing may flip is_universal true.
-- Existing "Admins can manage" + "Marketing role can manage" already cover writes;
-- we add a guard trigger to reject universal flips by any other role.
CREATE OR REPLACE FUNCTION public.guard_marketing_asset_universal_flip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_universal = true AND (TG_OP = 'INSERT' OR COALESCE(OLD.is_universal, false) = false) THEN
    IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'marketing'::app_role)) THEN
      RAISE EXCEPTION 'Only platform admins or marketing may publish a universal asset';
    END IF;
    NEW.universal_published_at := COALESCE(NEW.universal_published_at, now());
    NEW.universal_published_by := COALESCE(NEW.universal_published_by, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_universal_flip ON public.marketing_assets;
CREATE TRIGGER trg_guard_universal_flip
  BEFORE INSERT OR UPDATE OF is_universal ON public.marketing_assets
  FOR EACH ROW EXECUTE FUNCTION public.guard_marketing_asset_universal_flip();

-- 3. Recipient resolver: map universal_asset_new to the drafts-digest pref
CREATE OR REPLACE FUNCTION public.get_marketing_notification_recipients(_tenant_id uuid, _category text)
 RETURNS TABLE(user_id uuid, email text, channels text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _pref_key text := CASE _category
    WHEN 'draft_new' THEN 'marketing_drafts_digest'
    WHEN 'draft_resubmitted' THEN 'marketing_drafts_digest'
    WHEN 'dispatch_error' THEN 'marketing_errors'
    WHEN 'undeliverable' THEN 'marketing_errors'
    WHEN 'overdue' THEN 'marketing_errors'
    WHEN 'schedule_conflict' THEN 'marketing_conflicts'
    WHEN 'universal_asset_new' THEN 'marketing_drafts_digest'
    ELSE _category
  END;
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
    WHERE np.notification_type = _pref_key
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
$function$;

-- 4. enqueue_marketing_notification: add universal_asset_new to immediate list
CREATE OR REPLACE FUNCTION public.enqueue_marketing_notification(
  _tenant_id uuid, _category text, _related_kind text, _related_id uuid,
  _title text, _message text, _link text, _agent_source text,
  _payload jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _rec RECORD;
  _tenant_name text;
  _recipient_count int := 0;
  _is_immediate boolean := _category IN ('dispatch_error','undeliverable','schedule_conflict','overdue','universal_asset_new');
  _severity text := CASE WHEN _category IN ('dispatch_error','undeliverable','overdue') THEN 'warning' ELSE 'info' END;
BEGIN
  SELECT name INTO _tenant_name FROM public.tenants WHERE id = _tenant_id;

  FOR _rec IN
    SELECT * FROM public.get_marketing_notification_recipients(_tenant_id, _category)
  LOOP
    _recipient_count := _recipient_count + 1;
    INSERT INTO public.notifications (user_id, tenant_id, type, title, message, link, category, related_kind, related_id)
    VALUES (_rec.user_id, _tenant_id, _severity, _title, _message, _link, _category, _related_kind, _related_id);

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
        INSERT INTO public.marketing_notification_state (tenant_id, agent_source, category, pending_ids, next_flush_at)
        VALUES (
          _tenant_id, COALESCE(_agent_source, 'unknown'), _category,
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

  IF _recipient_count = 0 THEN
    INSERT INTO public.orphaned_notifications (tenant_id, category, related_kind, related_id, message, payload)
    VALUES (_tenant_id, _category, _related_kind, _related_id, _message, _payload);
  END IF;
END;
$function$;

-- 5. Fanout trigger: universal publish → notify every active tenant
CREATE OR REPLACE FUNCTION public.notify_universal_asset_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _t RECORD;
  _title text;
  _msg text;
  _link text := concat('/tenant/marketing?tab=universal&asset=', NEW.id::text);
BEGIN
  IF NEW.is_universal = true AND (TG_OP = 'INSERT' OR COALESCE(OLD.is_universal, false) = false) THEN
    _title := concat('New universal marketing asset: ', COALESCE(NEW.universal_title, NEW.label));
    _msg := COALESCE(NEW.universal_campaign_context, 'A new platform-wide marketing asset is available to adopt.');
    FOR _t IN SELECT id FROM public.tenants WHERE status = 'active' LOOP
      PERFORM public.enqueue_marketing_notification(
        _t.id, 'universal_asset_new', 'marketing_asset', NEW.id,
        _title, _msg, _link, 'platform',
        jsonb_build_object('asset_id', NEW.id, 'usage_notes', NEW.usage_notes)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_universal_asset ON public.marketing_assets;
CREATE TRIGGER trg_notify_universal_asset
  AFTER INSERT OR UPDATE OF is_universal ON public.marketing_assets
  FOR EACH ROW EXECUTE FUNCTION public.notify_universal_asset_published();

-- 6. Idempotency: one adoption per (tenant, source universal asset)
CREATE UNIQUE INDEX IF NOT EXISTS tenant_marketing_assets_unique_adoption
  ON public.tenant_marketing_assets (tenant_id, source_asset_id)
  WHERE source_asset_id IS NOT NULL;

-- 7. Admin adoption matrix view (security_invoker enforces caller's RLS)
DROP VIEW IF EXISTS public.v_universal_asset_adoption_matrix;
CREATE VIEW public.v_universal_asset_adoption_matrix
WITH (security_invoker = true) AS
SELECT
  ma.id AS asset_id,
  ma.universal_title,
  ma.label,
  ma.url,
  ma.universal_published_at,
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.slug AS tenant_slug,
  tma.id AS adopted_asset_id,
  tma.is_published AS tenant_published,
  CASE
    WHEN tma.id IS NULL THEN 'not_adopted'
    WHEN tma.is_published THEN 'published'
    ELSE 'adopted'
  END AS state
FROM public.marketing_assets ma
CROSS JOIN public.tenants t
LEFT JOIN public.tenant_marketing_assets tma
  ON tma.source_asset_id = ma.id AND tma.tenant_id = t.id
WHERE ma.is_universal = true
  AND t.status = 'active';

GRANT SELECT ON public.v_universal_asset_adoption_matrix TO authenticated;
