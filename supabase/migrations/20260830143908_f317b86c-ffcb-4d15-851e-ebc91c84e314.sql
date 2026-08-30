-- 1. Un-approving was impossible: the UPDATE policy's USING list omitted
--    'approved', so a human reviewer could arm a post but never disarm it.
--    Add exactly one value. 'published' and 'failed' stay terminal, and the
--    agent ceiling is unchanged (enforce_review_ceiling_scheduled_posts).
DROP POLICY IF EXISTS "Tenant marketers update own drafts" ON public.scheduled_posts;
CREATE POLICY "Tenant marketers update own drafts"
ON public.scheduled_posts
FOR UPDATE
USING (
  tenant_id IS NOT NULL
  AND status = ANY (ARRAY['draft','pending_review','rejected','approved','cancelled'])
  AND (proposed_by = auth.uid() OR is_tenant_marketer(tenant_id, auth.uid()))
)
WITH CHECK (tenant_id IS NOT NULL AND is_tenant_marketer(tenant_id, auth.uid()));

-- 2. Revert the test row through the same human path.
DO $$
DECLARE r record; eligible int;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"aaadeec9-4e65-47f9-a0d6-9fc00a272d8d","role":"authenticated"}', true);

  UPDATE public.scheduled_posts
     SET status = 'pending_review'
   WHERE id = '027ffc81-cd56-4bf3-ba01-edbac69933c9'
   RETURNING id, status, approved_at, approved_by, is_dispatch_approved INTO r;

  IF r.id IS NULL THEN RAISE EXCEPTION 'revert wrote 0 rows (RLS)'; END IF;
  IF r.approved_at IS NOT NULL OR r.is_dispatch_approved THEN
    RAISE EXCEPTION 'revert left approval stamp: %', row_to_json(r);
  END IF;

  RESET ROLE;
  SELECT count(*) INTO eligible FROM public.scheduled_posts WHERE is_dispatch_approved;
  IF eligible <> 0 THEN RAISE EXCEPTION 'armed rows remain: %', eligible; END IF;
END $$;