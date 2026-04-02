-- 1. Fix Security Definer Views → Security Invoker
ALTER VIEW public.profiles_public SET (security_invoker = true);
ALTER VIEW public.game_servers_public SET (security_invoker = true);
ALTER VIEW public.ecosystem_webhooks_safe SET (security_invoker = true);
ALTER VIEW public.social_connections_safe SET (security_invoker = true);

-- 2. Fix RLS Policy Always True on access_requests INSERT
DROP POLICY IF EXISTS "Anyone can submit access requests" ON public.access_requests;

CREATE POLICY "Anyone can submit access requests"
ON public.access_requests FOR INSERT
WITH CHECK (
  email IS NOT NULL AND email <> '' AND
  zip_code IS NOT NULL AND zip_code <> ''
);

-- 3. Fix RLS Enabled No Policy on engagement_email_log
CREATE POLICY "Admins can view email log"
ON public.engagement_email_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Service can insert email log"
ON public.engagement_email_log FOR INSERT
WITH CHECK (false);
