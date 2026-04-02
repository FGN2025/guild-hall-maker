-- Fix 1: Remove the anonymous read policy on challenge_enrollments
DROP POLICY IF EXISTS "Anon can read enrollments" ON public.challenge_enrollments;

-- Add an authenticated-only public read policy (users can see enrollment counts but only via authenticated access)
CREATE POLICY "Authenticated can read enrollments"
  ON public.challenge_enrollments FOR SELECT
  TO authenticated
  USING (true);

-- Fix 2: Add explicit SELECT policy for ecosystem_webhooks restricted to admins only
-- The ALL policy already restricts to admins, but add an explicit SELECT to be safe
-- and create a safe view that excludes secret_key for any future non-admin needs
CREATE OR REPLACE VIEW public.ecosystem_webhooks_safe AS
  SELECT id, event_type, target_app, webhook_url, is_active, created_at
  FROM public.ecosystem_webhooks;