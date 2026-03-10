
-- =============================================
-- QUEST TABLES (mirroring challenge tables)
-- =============================================

-- 1. quests (mirrors challenges)
CREATE TABLE public.quests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid REFERENCES public.games(id),
  points_reward integer NOT NULL DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  max_completions integer,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  points_first integer NOT NULL DEFAULT 10,
  points_second integer NOT NULL DEFAULT 5,
  points_third integer NOT NULL DEFAULT 3,
  points_participation integer NOT NULL DEFAULT 2,
  estimated_minutes integer,
  requires_evidence boolean NOT NULL DEFAULT true,
  max_enrollments integer,
  season_id uuid REFERENCES public.seasons(id),
  name text NOT NULL,
  description text,
  challenge_type text NOT NULL DEFAULT 'one_time',
  cover_image_url text,
  difficulty text NOT NULL DEFAULT 'beginner'
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read active quests" ON public.quests FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Anyone can view active quests" ON public.quests FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Moderators can manage quests" ON public.quests FOR ALL TO authenticated USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- 2. quest_tasks (mirrors challenge_tasks)
CREATE TABLE public.quest_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text
);

ALTER TABLE public.quest_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quest tasks" ON public.quest_tasks FOR SELECT TO public USING (EXISTS (SELECT 1 FROM quests q WHERE q.id = quest_tasks.quest_id AND q.is_active = true));
CREATE POLICY "Moderators can manage quest tasks" ON public.quest_tasks FOR ALL TO public USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- 3. quest_enrollments (mirrors challenge_enrollments)
CREATE TABLE public.quest_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'enrolled',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quest enrollments" ON public.quest_enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll in quests" ON public.quest_enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quest enrollments" ON public.quest_enrollments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quest enrollments" ON public.quest_enrollments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Moderators can view all quest enrollments" ON public.quest_enrollments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Moderators can manage quest enrollments" ON public.quest_enrollments FOR ALL TO authenticated USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- 4. quest_evidence (mirrors challenge_evidence)
CREATE TABLE public.quest_evidence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id uuid NOT NULL REFERENCES public.quest_enrollments(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.quest_tasks(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewer_notes text
);

ALTER TABLE public.quest_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own quest evidence" ON public.quest_evidence FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM quest_enrollments qe WHERE qe.id = quest_evidence.enrollment_id AND qe.user_id = auth.uid()));
CREATE POLICY "Users can view own quest evidence" ON public.quest_evidence FOR SELECT TO public USING (EXISTS (SELECT 1 FROM quest_enrollments qe WHERE qe.id = quest_evidence.enrollment_id AND qe.user_id = auth.uid()));
CREATE POLICY "Users can delete own quest evidence before submission" ON public.quest_evidence FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM quest_enrollments qe WHERE qe.id = quest_evidence.enrollment_id AND qe.user_id = auth.uid() AND qe.status IN ('enrolled', 'in_progress', 'rejected')));
CREATE POLICY "Moderators can view all quest evidence" ON public.quest_evidence FOR SELECT TO public USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Moderators can update quest evidence status" ON public.quest_evidence FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- 5. quest_completions (mirrors challenge_completions)
CREATE TABLE public.quest_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  awarded_points integer NOT NULL DEFAULT 0,
  verified_by uuid,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quest completions" ON public.quest_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Moderators can view all quest completions" ON public.quest_completions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Moderators can manage quest completions" ON public.quest_completions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Moderators can delete quest completions" ON public.quest_completions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- =============================================
-- TRIGGERS
-- =============================================

-- updated_at triggers
CREATE TRIGGER update_quests_updated_at BEFORE UPDATE ON public.quests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quest_enrollments_updated_at BEFORE UPDATE ON public.quest_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- notify_new_quest (in-app notification)
CREATE OR REPLACE FUNCTION public.notify_new_quest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID;
BEGIN
  IF NEW.is_active = true THEN
    FOR _uid IN SELECT user_id FROM public.profiles LOOP
      IF public.should_notify(_uid, 'new_quest', 'in_app') THEN
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (
          _uid,
          'info',
          'New Quest Available',
          '"' || NEW.name || '" — earn ' || NEW.points_reward || ' points!',
          '/quests'
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_quest_created AFTER INSERT ON public.quests FOR EACH ROW EXECUTE FUNCTION notify_new_quest();

-- email_new_quest (email notification)
CREATE OR REPLACE FUNCTION public.email_new_quest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rec RECORD;
BEGIN
  IF NEW.is_active = true THEN
    FOR _rec IN
      SELECT p.user_id, u.email
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.user_id
    LOOP
      IF public.should_notify(_rec.user_id, 'new_quest', 'email') THEN
        PERFORM net.http_post(
          url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-notification-email',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
          body := jsonb_build_object(
            'type', 'new_quest',
            'record', to_jsonb(NEW),
            'target_email', _rec.email
          )
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_quest_created_email AFTER INSERT ON public.quests FOR EACH ROW EXECUTE FUNCTION email_new_quest();
