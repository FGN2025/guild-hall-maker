
-- Create page_hero_images table
CREATE TABLE public.page_hero_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_hero_images ENABLE ROW LEVEL SECURITY;

-- Anyone can read hero images (public UI)
CREATE POLICY "Anyone can read page heroes"
  ON public.page_hero_images
  FOR SELECT
  USING (true);

-- Only admins can manage hero images
CREATE POLICY "Admins can manage page heroes"
  ON public.page_hero_images
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER update_page_hero_images_updated_at
  BEFORE UPDATE ON public.page_hero_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
