-- Internal agent config: staff only
DROP POLICY IF EXISTS "agent_mode_config_select_authenticated" ON public.agent_mode_config;
CREATE POLICY "agent_mode_config_select_staff" ON public.agent_mode_config
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Merit reference data: hide retired/orphaned rows
DROP POLICY IF EXISTS "official_badges_read" ON public.official_badges;
CREATE POLICY "official_badges_read" ON public.official_badges
FOR SELECT TO authenticated
USING (is_retired = false);

DROP POLICY IF EXISTS "badge_requirements_read" ON public.badge_requirements;
CREATE POLICY "badge_requirements_read" ON public.badge_requirements
FOR SELECT TO authenticated
USING (
  is_retired = false
  AND EXISTS (SELECT 1 FROM public.official_badges b WHERE b.id = badge_id AND b.is_retired = false)
);

DROP POLICY IF EXISTS "merit_challenges_read" ON public.merit_challenges;
CREATE POLICY "merit_challenges_read" ON public.merit_challenges
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.merits m WHERE m.id = merit_id)
  AND EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.is_active)
);

DROP POLICY IF EXISTS "task_req_mappings_read" ON public.task_requirement_mappings;
CREATE POLICY "task_req_mappings_read" ON public.task_requirement_mappings
FOR SELECT TO authenticated
USING (
  approved_at IS NOT NULL
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Community likes: only for posts that still exist
DROP POLICY IF EXISTS "Authenticated can view likes" ON public.community_likes;
CREATE POLICY "Authenticated can view likes" ON public.community_likes
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id));

-- Achievement catalogue: only active definitions are public
DROP POLICY IF EXISTS "Anyone can view achievement definitions" ON public.achievement_definitions;
CREATE POLICY "Anyone can view active achievement definitions" ON public.achievement_definitions
FOR SELECT TO anon, authenticated
USING (
  is_active
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Player achievements: public only for active achievements; owners/staff see all
DROP POLICY IF EXISTS "Anyone can view player achievements" ON public.player_achievements;
CREATE POLICY "Player achievements are viewable" ON public.player_achievements
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.achievement_definitions d
    WHERE d.id = achievement_id AND d.is_active
  )
  OR user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Challenge XP: scoreboard rows only; owners/staff see their own zeroed rows
DROP POLICY IF EXISTS "Challenge XP is viewable" ON public.player_challenge_xp;
CREATE POLICY "Challenge XP is viewable" ON public.player_challenge_xp
FOR SELECT TO anon, authenticated
USING (
  total_xp > 0
  OR user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Tenant challenge schedules: only schedules for live challenges
DROP POLICY IF EXISTS "Anyone can view challenge schedules" ON public.tenant_challenge_schedules;
CREATE POLICY "Anyone can view active challenge schedules" ON public.tenant_challenge_schedules
FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.is_active)
  OR created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Match results: only for tournaments that exist
DROP POLICY IF EXISTS "Anyone can view match results" ON public.match_results;
CREATE POLICY "Anyone can view match results" ON public.match_results
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id));

-- Ladder entries: only for ladders that exist
DROP POLICY IF EXISTS "Anyone can view ladder entries" ON public.ladder_entries;
CREATE POLICY "Anyone can view ladder entries" ON public.ladder_entries
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.ladders l WHERE l.id = ladder_id));

-- Career path mappings: only for live challenges
DROP POLICY IF EXISTS "Anyone can view career path mappings" ON public.career_path_mappings;
CREATE POLICY "Anyone can view career path mappings" ON public.career_path_mappings
FOR SELECT TO anon, authenticated
USING (
  challenge_id IS NULL
  OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.is_active)
);