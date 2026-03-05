
-- Migration C: Create challenge_enrollments table
CREATE TABLE public.challenge_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'enrolled',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE public.challenge_enrollments ENABLE ROW LEVEL SECURITY;

-- Users can view own enrollments
CREATE POLICY "Users can view own enrollments"
  ON public.challenge_enrollments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can enroll themselves
CREATE POLICY "Users can enroll themselves"
  ON public.challenge_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own enrollment (e.g. submit)
CREATE POLICY "Users can update own enrollment"
  ON public.challenge_enrollments FOR UPDATE
  USING (auth.uid() = user_id);

-- Moderators can view all enrollments
CREATE POLICY "Moderators can view all enrollments"
  ON public.challenge_enrollments FOR SELECT
  USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Moderators can update enrollment status
CREATE POLICY "Moderators can update enrollments"
  ON public.challenge_enrollments FOR UPDATE
  USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Migration D: Create challenge_evidence table
CREATE TABLE public.challenge_evidence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id uuid NOT NULL REFERENCES public.challenge_enrollments(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.challenge_tasks(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  notes text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_evidence ENABLE ROW LEVEL SECURITY;

-- Users can insert own evidence
CREATE POLICY "Users can insert own evidence"
  ON public.challenge_evidence FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.challenge_enrollments ce WHERE ce.id = challenge_evidence.enrollment_id AND ce.user_id = auth.uid()
  ));

-- Users can view own evidence
CREATE POLICY "Users can view own evidence"
  ON public.challenge_evidence FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.challenge_enrollments ce WHERE ce.id = challenge_evidence.enrollment_id AND ce.user_id = auth.uid()
  ));

-- Moderators can view all evidence
CREATE POLICY "Moderators can view all evidence"
  ON public.challenge_evidence FOR SELECT
  USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
