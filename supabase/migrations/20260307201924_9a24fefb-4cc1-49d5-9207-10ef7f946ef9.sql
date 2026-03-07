-- Allow admins to delete any media (not just their own)
CREATE POLICY "Admins can delete any media"
  ON public.media_library FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow moderators to delete any media
CREATE POLICY "Moderators can delete any media"
  ON public.media_library FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow admins full access on match_results
CREATE POLICY "Admins can manage match results"
  ON public.match_results FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));