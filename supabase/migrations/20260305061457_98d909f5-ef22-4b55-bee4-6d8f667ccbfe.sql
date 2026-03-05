-- Add per-evidence review status columns
ALTER TABLE public.challenge_evidence
  ADD COLUMN status text NOT NULL DEFAULT 'pending',
  ADD COLUMN reviewer_notes text,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by uuid;

-- Allow moderators/admins to update evidence status
CREATE POLICY "Moderators can update evidence status"
ON public.challenge_evidence
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);