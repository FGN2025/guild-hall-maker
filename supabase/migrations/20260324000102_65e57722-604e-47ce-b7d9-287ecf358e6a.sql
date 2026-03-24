
CREATE TABLE public.quest_task_point_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.quest_enrollments(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.quest_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, task_id)
);

ALTER TABLE public.quest_task_point_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own task awards"
  ON public.quest_task_point_awards FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins and moderators can read all task awards"
  ON public.quest_task_point_awards FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can insert task awards"
  ON public.quest_task_point_awards FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
