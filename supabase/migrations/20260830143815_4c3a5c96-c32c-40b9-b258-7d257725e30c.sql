DO $$
DECLARE r record; eligible int;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"aaadeec9-4e65-47f9-a0d6-9fc00a272d8d","role":"authenticated"}', true);

  -- Exact patch the Approve button issues via PostgREST.
  UPDATE public.scheduled_posts
     SET status = 'approved', feedback_note = NULL
   WHERE id = '027ffc81-cd56-4bf3-ba01-edbac69933c9'
   RETURNING id, status, approved_at, approved_by, is_dispatch_approved, scheduled_at INTO r;

  IF r.id IS NULL THEN RAISE EXCEPTION 'approve wrote 0 rows (RLS)'; END IF;
  RAISE NOTICE 'APPROVE OK %', row_to_json(r);

  RESET ROLE;
  SELECT count(*) INTO eligible FROM public.scheduled_posts
   WHERE is_dispatch_approved AND scheduled_at <= now() AND scheduled_at >= now() - interval '6 hours';
  IF eligible <> 0 THEN RAISE EXCEPTION 'dispatch-eligible rows: %', eligible; END IF;
END $$;