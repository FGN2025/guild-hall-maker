CREATE POLICY "Users can delete own evidence before submission"
ON public.challenge_evidence
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM challenge_enrollments ce
    WHERE ce.id = challenge_evidence.enrollment_id
      AND ce.user_id = auth.uid()
      AND ce.status IN ('enrolled', 'in_progress', 'rejected')
  )
);