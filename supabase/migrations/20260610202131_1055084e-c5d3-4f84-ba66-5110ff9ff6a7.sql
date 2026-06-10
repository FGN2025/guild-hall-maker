
CREATE TABLE public.match_point_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.match_results(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('participation','win','loss')),
  points integer NOT NULL DEFAULT 0,
  season_id uuid,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  awarded_by uuid,
  UNIQUE (match_id, user_id, kind)
);

CREATE INDEX idx_match_point_awards_user ON public.match_point_awards(user_id);
CREATE INDEX idx_match_point_awards_tournament ON public.match_point_awards(tournament_id);

GRANT SELECT ON public.match_point_awards TO authenticated;
GRANT ALL ON public.match_point_awards TO service_role;

ALTER TABLE public.match_point_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own awards" ON public.match_point_awards
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));
