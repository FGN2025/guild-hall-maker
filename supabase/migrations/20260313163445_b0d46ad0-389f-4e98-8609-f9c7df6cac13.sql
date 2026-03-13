CREATE POLICY "Moderators can manage achievement definitions"
ON public.achievement_definitions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));