CREATE OR REPLACE FUNCTION public.get_marketing_notification_recipients(
  _tenant_id uuid,
  _category text
)
RETURNS TABLE (user_id uuid, email text, channels text[])
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pref_key text := CASE _category
    WHEN 'draft_new' THEN 'marketing_drafts_digest'
    WHEN 'draft_resubmitted' THEN 'marketing_drafts_digest'
    WHEN 'dispatch_error' THEN 'marketing_errors'
    WHEN 'undeliverable' THEN 'marketing_errors'
    WHEN 'overdue' THEN 'marketing_errors'
    WHEN 'schedule_conflict' THEN 'marketing_conflicts'
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
$$;

REVOKE ALL ON FUNCTION public.get_marketing_notification_recipients(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marketing_notification_recipients(uuid,text) TO service_role;