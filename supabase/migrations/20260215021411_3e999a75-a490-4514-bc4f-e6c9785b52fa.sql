
-- Create page_backgrounds table
CREATE TABLE public.page_backgrounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug text NOT NULL UNIQUE,
  image_url text NOT NULL,
  opacity real NOT NULL DEFAULT 0.15,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_backgrounds ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can read page backgrounds"
  ON public.page_backgrounds FOR SELECT
  USING (true);

-- Admin-only write
CREATE POLICY "Admins can manage page backgrounds"
  ON public.page_backgrounds FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update timestamp
CREATE TRIGGER update_page_backgrounds_updated_at
  BEFORE UPDATE ON public.page_backgrounds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
