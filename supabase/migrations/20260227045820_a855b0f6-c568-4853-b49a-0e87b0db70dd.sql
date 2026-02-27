
-- Drop blocking policies
DROP POLICY "Only service role manages scores" ON public.season_scores;
DROP POLICY "Only service role updates scores" ON public.season_scores;

-- Recreate INSERT policy with admin support
DROP POLICY "Moderators can insert season scores" ON public.season_scores;
CREATE POLICY "Moderators can insert season scores"
  ON public.season_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Recreate UPDATE policy with admin support
DROP POLICY "Moderators can update season scores" ON public.season_scores;
CREATE POLICY "Moderators can update season scores"
  ON public.season_scores FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
