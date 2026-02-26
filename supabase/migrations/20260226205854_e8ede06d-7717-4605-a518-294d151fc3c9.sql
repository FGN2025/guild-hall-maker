
-- Marketing campaigns table
CREATE TABLE public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  social_copy text,
  category text NOT NULL DEFAULT 'social_media',
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage marketing campaigns"
  ON public.marketing_campaigns FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Published campaigns readable by any authenticated user (tenants)
CREATE POLICY "Authenticated can view published campaigns"
  ON public.marketing_campaigns FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Marketing assets table
CREATE TABLE public.marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Default',
  file_path text NOT NULL,
  url text NOT NULL,
  width integer,
  height integer,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage marketing assets"
  ON public.marketing_assets FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Assets of published campaigns readable by authenticated users
CREATE POLICY "Authenticated can view published campaign assets"
  ON public.marketing_assets FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketing_campaigns mc
    WHERE mc.id = campaign_id AND mc.is_published = true
  ));

-- Auto-update updated_at on marketing_campaigns
CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
