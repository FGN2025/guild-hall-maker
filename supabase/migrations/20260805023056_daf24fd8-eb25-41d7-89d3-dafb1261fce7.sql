DROP POLICY IF EXISTS "Anyone can view calendar images" ON storage.objects;
DROP POLICY IF EXISTS "Public read calendar-images" ON storage.objects;

CREATE POLICY "Authenticated read calendar-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'calendar-images');