-- 1) Scope evidence policies to authenticated role only (same conditions)
DROP POLICY IF EXISTS "Users can insert own quest evidence" ON public.quest_evidence;
CREATE POLICY "Users can insert own quest evidence"
ON public.quest_evidence FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.quest_enrollments qe WHERE qe.id = quest_evidence.enrollment_id AND qe.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own quest evidence" ON public.quest_evidence;
CREATE POLICY "Users can view own quest evidence"
ON public.quest_evidence FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.quest_enrollments qe WHERE qe.id = quest_evidence.enrollment_id AND qe.user_id = auth.uid()));

DROP POLICY IF EXISTS "Moderators can view all quest evidence" ON public.quest_evidence;
CREATE POLICY "Moderators can view all quest evidence"
ON public.quest_evidence FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can insert own evidence" ON public.challenge_evidence;
CREATE POLICY "Users can insert own evidence"
ON public.challenge_evidence FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.challenge_enrollments ce WHERE ce.id = challenge_evidence.enrollment_id AND ce.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own evidence" ON public.challenge_evidence;
CREATE POLICY "Users can view own evidence"
ON public.challenge_evidence FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.challenge_enrollments ce WHERE ce.id = challenge_evidence.enrollment_id AND ce.user_id = auth.uid()));

DROP POLICY IF EXISTS "Moderators can view all evidence" ON public.challenge_evidence;
CREATE POLICY "Moderators can view all evidence"
ON public.challenge_evidence FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 2) social_connections: ensure OAuth tokens are unreachable from client roles
REVOKE ALL ON public.social_connections FROM anon;
REVOKE SELECT (access_token, refresh_token), UPDATE (access_token, refresh_token), INSERT (access_token, refresh_token)
  ON public.social_connections FROM authenticated;
GRANT ALL ON public.social_connections TO service_role;