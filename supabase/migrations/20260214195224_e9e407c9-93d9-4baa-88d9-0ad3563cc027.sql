
ALTER TABLE public.community_posts ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

-- Allow admins to update any post (for pinning)
CREATE POLICY "Admins can update any post"
ON public.community_posts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
