DROP POLICY IF EXISTS "Users can request redemptions" ON public.prize_redemptions;
CREATE POLICY "ISP-linked users can request redemptions"
ON public.prize_redemptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.get_user_tenant(auth.uid()) IS NOT NULL);