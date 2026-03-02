-- Remove the duplicate test row
DELETE FROM public.access_requests
WHERE email = 'testuser@example.com'
  AND status = 'pending'
  AND created_at > '2026-03-02 15:39:00+00';

-- Add a partial unique index to prevent duplicates at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS uq_access_requests_email_active
ON public.access_requests (email)
WHERE status IN ('pending', 'approved');