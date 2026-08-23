SELECT cron.schedule(
  'pending-review-digest-daily',
  '0 14 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/pending-review-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);