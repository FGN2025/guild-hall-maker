
-- Add moderator RLS policies for tournaments
CREATE POLICY "Moderators can manage tournaments"
ON public.tournaments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Add moderator RLS policies for match_results
CREATE POLICY "Moderators can manage match results"
ON public.match_results
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Allow moderators to delete match results (currently nobody can)
CREATE POLICY "Moderators can delete match results"
ON public.match_results
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'));

-- Add moderator policies for season_scores (currently service-role only for insert/update)
CREATE POLICY "Moderators can insert season scores"
ON public.season_scores
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update season scores"
ON public.season_scores
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'));

-- Create point_adjustments audit trail table
CREATE TABLE public.point_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  adjusted_by UUID NOT NULL,
  season_id UUID REFERENCES public.seasons(id),
  points_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  adjustment_type TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.point_adjustments ENABLE ROW LEVEL SECURITY;

-- Moderators and admins can view and create adjustments
CREATE POLICY "Moderators can view point adjustments"
ON public.point_adjustments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Moderators can insert point adjustments"
ON public.point_adjustments
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')
);

-- Add moderator policies for tournament_registrations management
CREATE POLICY "Moderators can manage registrations"
ON public.tournament_registrations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));
