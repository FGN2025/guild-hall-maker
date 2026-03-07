
-- Create web_pages table
CREATE TABLE public.web_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

-- Create web_page_sections table
CREATE TABLE public.web_page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.web_pages(id) ON DELETE CASCADE,
  section_type text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.web_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_page_sections ENABLE ROW LEVEL SECURITY;

-- RLS for web_pages
CREATE POLICY "Admins can manage all web pages"
  ON public.web_pages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Marketing can manage all web pages"
  ON public.web_pages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'marketing'::app_role))
  WITH CHECK (has_role(auth.uid(), 'marketing'::app_role));

CREATE POLICY "Tenant members can manage their pages"
  ON public.web_pages FOR ALL TO authenticated
  USING (is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (is_tenant_member(tenant_id, auth.uid()));

CREATE POLICY "Anyone can view published web pages"
  ON public.web_pages FOR SELECT
  USING (is_published = true);

-- RLS for web_page_sections
CREATE POLICY "Admins can manage all sections"
  ON public.web_page_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.web_pages wp WHERE wp.id = page_id AND has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.web_pages wp WHERE wp.id = page_id AND has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Marketing can manage all sections"
  ON public.web_page_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.web_pages wp WHERE wp.id = page_id AND has_role(auth.uid(), 'marketing'::app_role)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.web_pages wp WHERE wp.id = page_id AND has_role(auth.uid(), 'marketing'::app_role)));

CREATE POLICY "Tenant members can manage their sections"
  ON public.web_page_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.web_pages wp WHERE wp.id = page_id AND is_tenant_member(wp.tenant_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.web_pages wp WHERE wp.id = page_id AND is_tenant_member(wp.tenant_id, auth.uid())));

CREATE POLICY "Anyone can view published page sections"
  ON public.web_page_sections FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.web_pages wp WHERE wp.id = page_id AND wp.is_published = true));

-- Updated_at triggers
CREATE TRIGGER update_web_pages_updated_at
  BEFORE UPDATE ON public.web_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_web_page_sections_updated_at
  BEFORE UPDATE ON public.web_page_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for web_pages
ALTER PUBLICATION supabase_realtime ADD TABLE public.web_pages;
