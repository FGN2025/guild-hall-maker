
-- 1. Fix challenge_enrollments broad read: drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated can read enrollments" ON public.challenge_enrollments;

-- 2. Fix game_servers infrastructure leak: create a public view excluding sensitive panel columns
CREATE OR REPLACE VIEW public.game_servers_public AS
SELECT
  id, name, game, game_id, ip_address, port, description, image_url,
  max_players, connection_instructions, is_active, display_order,
  created_by, created_at, updated_at,
  (panel_type IS NOT NULL AND panel_url IS NOT NULL AND panel_server_id IS NOT NULL) AS has_panel
FROM public.game_servers;

-- Restrict base table SELECT to admins/moderators only
DROP POLICY IF EXISTS "Authenticated can view active servers" ON public.game_servers;

CREATE POLICY "Admins can view all servers"
ON public.game_servers FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
);

-- Allow authenticated users to read via the public view
GRANT SELECT ON public.game_servers_public TO authenticated;

-- 3. Fix app-media open upload: scope regular users to their own folder, admins can upload anywhere
DROP POLICY IF EXISTS "Authenticated users can upload to app-media" ON storage.objects;

CREATE POLICY "Users upload to own folder in app-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'app-media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  )
);
