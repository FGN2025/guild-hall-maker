
CREATE POLICY "Anon can read active challenges"
ON public.challenges
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Anon can read enrollments"
ON public.challenge_enrollments
FOR SELECT
TO anon
USING (true);
