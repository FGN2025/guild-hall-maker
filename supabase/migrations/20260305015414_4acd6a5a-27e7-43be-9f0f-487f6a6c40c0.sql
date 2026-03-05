-- 1. Drop the existing restrictive SELECT policy on calendar_publish_configs
DROP POLICY IF EXISTS "Anyone can view active configs" ON public.calendar_publish_configs;

-- 2. Create permissive SELECT policy for anon + authenticated
CREATE POLICY "Anon and authenticated can view active configs"
ON public.calendar_publish_configs
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 3. Add permissive SELECT policy on tournaments for anon
CREATE POLICY "Anon can read tournaments"
ON public.tournaments
FOR SELECT
TO anon
USING (true);

-- 4. Add permissive SELECT policy on tenant_events for anon (public + published only)
CREATE POLICY "Anon can view public tenant events"
ON public.tenant_events
FOR SELECT
TO anon
USING (is_public = true AND status = 'published');