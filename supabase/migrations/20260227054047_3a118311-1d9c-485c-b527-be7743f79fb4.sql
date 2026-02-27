CREATE POLICY "Tournament creators can delete matches"
  ON public.match_results
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = match_results.tournament_id
        AND tournaments.created_by = auth.uid()
    )
  );