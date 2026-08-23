CREATE OR REPLACE FUNCTION public.enqueue_marketing_notification(_tenant_id uuid, _category text, _related_kind text, _related_id uuid, _title text, _message text, _link text, _agent_source text, _payload jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rec RECORD;
  _tenant_name text;
  _recipient_count int := 0;
  _is_immediate boolean := _category IN ('dispatch_error','undeliverable','schedule_conflict','overdue','universal_asset_new');
  _severity text := CASE WHEN _category IN ('dispatch_error','undeliverable','overdue') THEN 'warning' ELSE 'info' END;
  _key text;
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
        -- CANONICAL SEND PATH: post to send-transactional-email so the message is
        -- RENDERED before it is enqueued. Enqueueing a raw template job directly
        -- onto transactional_emails produces a payload process-email-queue cannot
        -- consume, and it silently dead-letters. One path, not two that must agree.
        _key := concat('mkt-', _category, '-', _related_id, '-', _rec.user_id);
        BEGIN
          PERFORM net.http_post(
            url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-transactional-email',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (
                SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
              )
            ),
            body := jsonb_build_object(
              'templateName', 'marketing-alert',
              'recipientEmail', _rec.email,
              'idempotencyKey', _key,
              'templateData', jsonb_build_object(
                'tenantName', COALESCE(_tenant_name, 'your tenant'),
                'category', _category,
                'title', _title,
                'message', _message,
                'link', _link
              )
            )
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'marketing alert dispatch failed (in-app notification preserved): %', SQLERRM;
        END;
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