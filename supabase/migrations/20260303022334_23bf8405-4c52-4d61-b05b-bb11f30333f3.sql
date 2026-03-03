-- Remove the overly restrictive service-role-only policies that block admin UI access
DROP POLICY IF EXISTS "Only service role manages seasons" ON public.seasons;
DROP POLICY IF EXISTS "Only service role updates seasons" ON public.seasons;
