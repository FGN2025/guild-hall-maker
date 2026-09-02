-- Storage RLS for the private 'evidence' bucket (challenge/quest evidence files)

-- Uploaders write only into their own folder (first path segment = auth.uid())
CREATE POLICY "Users upload own evidence files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Owners read their own evidence files
CREATE POLICY "Users read own evidence files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Staff (moderator/admin) read all evidence files, mirroring challenge_evidence/quest_evidence SELECT policies
CREATE POLICY "Staff read evidence files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evidence' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)));

-- Owners and staff can remove evidence files
CREATE POLICY "Owners and staff delete evidence files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'evidence' AND ((storage.foldername(name))[1] = auth.uid()::text OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)));