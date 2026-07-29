-- 1. media_library: restrict SELECT to owner + staff
DROP POLICY IF EXISTS "Authenticated users can view media" ON public.media_library;

CREATE POLICY "Users and staff can view media"
ON public.media_library
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR public.has_role(auth.uid(), 'marketing'::app_role)
);

-- 2. storage app-media: harden ownership checks (path-based + server-set owner_id)
DROP POLICY IF EXISTS "Uploaders can delete own app-media files" ON storage.objects;

CREATE POLICY "Uploaders can delete own app-media files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'app-media'
  AND (
    (
      (storage.foldername(name))[1] = (auth.uid())::text
      AND owner_id = (auth.uid())::text
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);

DROP POLICY IF EXISTS "app-media owners or staff can update" ON storage.objects;

CREATE POLICY "app-media owners or staff can update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'app-media'
  AND (
    (
      (storage.foldername(name))[1] = (auth.uid())::text
      AND owner_id = (auth.uid())::text
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'app-media'
  AND (
    (
      (storage.foldername(name))[1] = (auth.uid())::text
      AND owner_id = (auth.uid())::text
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);