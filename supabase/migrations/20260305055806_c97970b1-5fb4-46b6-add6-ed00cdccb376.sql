
-- Migration B: Create challenge_tasks table
CREATE TABLE public.challenge_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_tasks ENABLE ROW LEVEL SECURITY;

-- Anyone can view tasks for active challenges
CREATE POLICY "Anyone can view challenge tasks"
  ON public.challenge_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.challenges c WHERE c.id = challenge_tasks.challenge_id AND c.is_active = true
  ));

-- Moderators/admins can manage tasks
CREATE POLICY "Moderators can manage challenge tasks"
  ON public.challenge_tasks FOR ALL
  USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
