-- Create a safe view that hides sensitive token columns
CREATE OR REPLACE VIEW public.social_connections_safe
WITH (security_invoker = false)
AS
SELECT id, tenant_id, user_id, platform, account_name, page_id, is_active, token_expires_at, created_at, updated_at
FROM public.social_connections;

-- Make the view accessible
GRANT SELECT ON public.social_connections_safe TO authenticated;
GRANT SELECT ON public.social_connections_safe TO anon;

-- Drop the overly permissive tenant member SELECT policy
DROP POLICY IF EXISTS "Tenant members view connections" ON public.social_connections;

-- Replace with owner-only + admin SELECT policy
CREATE POLICY "Owner or admin can view connections"
  ON public.social_connections
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );