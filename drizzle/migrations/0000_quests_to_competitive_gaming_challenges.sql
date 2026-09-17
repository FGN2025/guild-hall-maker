-- 1. Additive columns on challenges
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS track TEXT,
  ADD COLUMN IF NOT EXISTS xp_reward INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS series_id UUID,
  ADD COLUMN IF NOT EXISTS series_order INTEGER,
  ADD COLUMN IF NOT EXISTS story_intro TEXT,
  ADD COLUMN IF NOT EXISTS story_outro TEXT;

CREATE INDEX IF NOT EXISTS idx_challenges_track ON public.challenges(track);

-- 2. Challenge series (formerly quest chains)
CREATE TABLE IF NOT EXISTS public.challenge_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  story_intro TEXT,
  story_outro TEXT,
  cover_image_url TEXT,
  bonus_points INTEGER NOT NULL DEFAULT 0,
  bonus_achievement_id UUID,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.challenge_series TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_series TO authenticated;
GRANT ALL ON public.challenge_series TO service_role;
ALTER TABLE public.challenge_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active challenge series" ON public.challenge_series;
CREATE POLICY "Anyone can view active challenge series"
  ON public.challenge_series FOR SELECT
  USING (is_active OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS "Staff manage challenge series" ON public.challenge_series;
CREATE POLICY "Staff manage challenge series"
  ON public.challenge_series FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TABLE IF NOT EXISTS public.challenge_series_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  series_id UUID NOT NULL REFERENCES public.challenge_series(id) ON DELETE CASCADE,
  bonus_points_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, series_id)
);

GRANT SELECT, INSERT ON public.challenge_series_completions TO authenticated;
GRANT ALL ON public.challenge_series_completions TO service_role;
ALTER TABLE public.challenge_series_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own series completions" ON public.challenge_series_completions;
CREATE POLICY "Users view own series completions"
  ON public.challenge_series_completions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 3. Task point awards
CREATE TABLE IF NOT EXISTS public.challenge_task_point_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, task_id)
);

GRANT SELECT ON public.challenge_task_point_awards TO authenticated;
GRANT ALL ON public.challenge_task_point_awards TO service_role;
ALTER TABLE public.challenge_task_point_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own task awards" ON public.challenge_task_point_awards;
CREATE POLICY "Users view own task awards"
  ON public.challenge_task_point_awards FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 4. Player XP
CREATE TABLE IF NOT EXISTS public.player_challenge_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  rank_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.player_challenge_xp TO anon;
GRANT SELECT ON public.player_challenge_xp TO authenticated;
GRANT ALL ON public.player_challenge_xp TO service_role;
ALTER TABLE public.player_challenge_xp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Challenge XP is viewable" ON public.player_challenge_xp;
CREATE POLICY "Challenge XP is viewable" ON public.player_challenge_xp FOR SELECT USING (true);

-- 5. Backfill (notification/email/webhook triggers suspended so no blast goes out)
ALTER TABLE public.challenges DISABLE TRIGGER trg_email_new_challenge;
ALTER TABLE public.challenges DISABLE TRIGGER trg_new_challenge_notify;
ALTER TABLE public.challenges DISABLE TRIGGER challenges_merit_webhook;
ALTER TABLE public.challenge_completions DISABLE TRIGGER trg_enqueue_academy_sync;
ALTER TABLE public.challenge_evidence DISABLE TRIGGER trg_enqueue_academy_task_sync;

INSERT INTO public.challenge_series (id, name, description, story_intro, story_outro, cover_image_url, bonus_points, bonus_achievement_id, display_order, is_active, created_by, created_at, updated_at)
SELECT id, name, description, story_intro, story_outro, cover_image_url, bonus_points, bonus_achievement_id, display_order, is_active, created_by, created_at, updated_at
FROM public.quest_chains
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.challenges (
  id, name, description, game_id, points_reward, start_date, end_date, max_completions,
  challenge_type, is_active, created_by, created_at, updated_at,
  points_first, points_second, points_third, points_participation,
  cover_image_url, difficulty, estimated_minutes, requires_evidence, max_enrollments,
  season_id, is_featured, achievement_id, points_override_reason, points_overridden_by,
  featured_start_at, featured_end_at,
  track, xp_reward, series_id, series_order, story_intro, story_outro
)
SELECT
  q.id, q.name, q.description, q.game_id, q.points_reward, q.start_date, q.end_date, q.max_completions,
  COALESCE(q.challenge_type, 'standard'), q.is_active, q.created_by, q.created_at, q.updated_at,
  q.points_first, q.points_second, q.points_third, q.points_participation,
  q.cover_image_url, q.difficulty, q.estimated_minutes, q.requires_evidence, q.max_enrollments,
  q.season_id, q.is_featured, q.achievement_id, q.points_override_reason, q.points_overridden_by,
  q.featured_start_at, q.featured_end_at,
  'competitive_gaming', COALESCE(q.xp_reward, 0), q.chain_id, q.chain_order, q.story_intro, q.story_outro
FROM public.quests q
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.challenge_tasks (id, challenge_id, title, description, display_order, created_at)
SELECT t.id, t.quest_id, t.title, t.description, t.display_order, t.created_at
FROM public.quest_tasks t
WHERE EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = t.quest_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.challenge_enrollments (id, challenge_id, user_id, enrolled_at, status, updated_at)
SELECT e.id, e.quest_id, e.user_id, e.enrolled_at, e.status, e.updated_at
FROM public.quest_enrollments e
WHERE EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = e.quest_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.challenge_completions (id, user_id, challenge_id, awarded_points, verified_by, completed_at, academy_synced, academy_synced_at, academy_sync_note, academy_sync_attempts)
SELECT c.id, c.user_id, c.quest_id, c.awarded_points, c.verified_by, c.completed_at, c.academy_synced, c.academy_synced_at, c.academy_sync_note, c.academy_sync_attempts
FROM public.quest_completions c
WHERE EXISTS (SELECT 1 FROM public.challenges ch WHERE ch.id = c.quest_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.challenge_evidence (id, enrollment_id, task_id, file_url, file_type, notes, submitted_at, status, reviewer_notes, reviewed_at, reviewed_by)
SELECT v.id, v.enrollment_id, v.task_id, v.file_url, v.file_type, v.notes, v.submitted_at, v.status, v.reviewer_notes, v.reviewed_at, v.reviewed_by
FROM public.quest_evidence v
WHERE EXISTS (SELECT 1 FROM public.challenge_enrollments e WHERE e.id = v.enrollment_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.challenge_task_point_awards (id, enrollment_id, task_id, user_id, points_awarded, awarded_at)
SELECT a.id, a.enrollment_id, a.task_id, a.user_id, a.points_awarded, a.awarded_at
FROM public.quest_task_point_awards a
WHERE EXISTS (SELECT 1 FROM public.challenge_enrollments e WHERE e.id = a.enrollment_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.player_challenge_xp (user_id, total_xp, rank_name, updated_at)
SELECT x.user_id, x.total_xp, x.quest_rank, x.updated_at
FROM public.player_quest_xp x
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.challenges ENABLE TRIGGER trg_email_new_challenge;
ALTER TABLE public.challenges ENABLE TRIGGER trg_new_challenge_notify;
ALTER TABLE public.challenges ENABLE TRIGGER challenges_merit_webhook;
ALTER TABLE public.challenge_completions ENABLE TRIGGER trg_enqueue_academy_sync;
ALTER TABLE public.challenge_evidence ENABLE TRIGGER trg_enqueue_academy_task_sync;