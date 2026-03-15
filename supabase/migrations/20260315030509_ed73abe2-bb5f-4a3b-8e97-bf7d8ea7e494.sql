-- The view must be SECURITY DEFINER to bypass owner-only RLS on profiles
-- This is intentional: the view only exposes non-sensitive columns
ALTER VIEW public.profiles_public SET (security_invoker = false);

-- Explicitly set the view owner to ensure it has the right privileges
ALTER VIEW public.profiles_public OWNER TO postgres;