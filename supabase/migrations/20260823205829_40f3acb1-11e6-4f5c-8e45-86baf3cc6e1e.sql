DO $$
DECLARE _a bigint; _b bigint;
BEGIN
  SELECT public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id','dlqfix-probe-A','label','probe-A-resolvable','to','probe-a@fgn-test.local',
    'subject','probe','html','<p>probe</p>','queued_at', (now() - interval '3 hours')::text
  )) INTO _a;
  SELECT public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id','dlqfix-probe-B','label','probe-B-no-recipient',
    'subject','probe','html','<p>probe</p>','queued_at', (now() - interval '3 hours')::text
  )) INTO _b;
  RAISE NOTICE 'probes enqueued % %', _a, _b;
  PERFORM net.http_post(
    url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
END $$;