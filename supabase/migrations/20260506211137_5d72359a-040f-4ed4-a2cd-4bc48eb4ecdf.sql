CREATE TABLE IF NOT EXISTS public.tournament_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  place smallint NOT NULL CHECK (place IN (1, 2, 3)),
  user_id uuid NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  awarded_by uuid,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, place)
);

CREATE INDEX IF NOT EXISTS idx_tournament_placements_tournament ON public.tournament_placements(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_placements_user ON public.tournament_placements(user_id);

ALTER TABLE public.tournament_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Placements viewable by authenticated"
  ON public.tournament_placements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff manage placements - insert"
  ON public.tournament_placements FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Staff manage placements - update"
  ON public.tournament_placements FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Staff manage placements - delete"
  ON public.tournament_placements FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));