
CREATE TABLE public.guide_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_slug text NOT NULL,
  section_id text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guide_media ENABLE ROW LEVEL SECURITY;

-- Public read access (guides are public content)
CREATE POLICY "Anyone can read guide media"
  ON public.guide_media FOR SELECT
  USING (true);

-- Admin/moderator write access
CREATE POLICY "Admins and moderators can insert guide media"
  ON public.guide_media FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can update guide media"
  ON public.guide_media FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can delete guide media"
  ON public.guide_media FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX idx_guide_media_slug ON public.guide_media (guide_slug, section_id, sort_order);
