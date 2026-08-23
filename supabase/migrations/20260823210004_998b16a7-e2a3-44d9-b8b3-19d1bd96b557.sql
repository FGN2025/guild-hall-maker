DELETE FROM public.notifications
WHERE id IN (
  '9e102337-100e-46ac-840e-5b0a20516ea1','15ca79b3-77d6-437f-a605-befda237c7c6',
  '1c0fb661-519a-4bd3-9491-93de5d86207c','cf108d4c-1458-4829-9a6e-024dc29fbddd',
  '17234e4c-376d-48b1-8ec5-8373413db892','8741cec9-c2ec-4f2d-a021-8fa7cbf934b1',
  '41636786-12af-473a-975f-f982c3b6b862','59eae631-bf18-438c-b239-abc7526a0d73'
);

DELETE FROM public.email_send_log
WHERE id IN (
  '62cf87e5-37b0-4987-846b-7197db91a6bc','658c59a3-8213-4171-88d5-f3e1fc74e66f',
  '7e5c2f60-5cc2-4b4c-bcf6-326816edf32d','0116ded0-1bc2-4240-8c97-050f7eec5536'
);

DO $$
DECLARE _m RECORD;
BEGIN
  FOR _m IN SELECT msg_id, message FROM pgmq.q_transactional_emails_dlq LOOP
    IF (_m.message->>'message_id') IN ('dlqfix-probe-A','dlqfix-probe-B') THEN
      PERFORM pgmq.delete('transactional_emails_dlq', _m.msg_id);
    END IF;
  END LOOP;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;