DROP POLICY IF EXISTS "Moderators can view all redemptions" ON public.prize_redemptions;
DROP POLICY IF EXISTS "Moderators can update redemptions" ON public.prize_redemptions;

CREATE POLICY "Admins can view all redemptions"
ON public.prize_redemptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update redemptions"
ON public.prize_redemptions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));