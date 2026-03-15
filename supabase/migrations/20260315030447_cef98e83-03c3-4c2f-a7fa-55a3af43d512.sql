-- Drop the broad SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Owner can read their full profile row (including sensitive fields)
CREATE POLICY "Owner can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create a public view that excludes sensitive PII columns
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  user_id,
  display_name,
  gamer_tag,
  avatar_url,
  discord_username,
  discord_avatar,
  discord_bypass_approved,
  discord_linked_at,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;