
-- Scheduling window for web pages (banner + landing pages)
ALTER TABLE public.web_pages
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS unpublish_at timestamptz;

-- Curated + universal page templates
CREATE TABLE IF NOT EXISTS public.web_page_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  preview_image_url text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_universal boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.web_page_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_page_templates TO authenticated;
GRANT ALL ON public.web_page_templates TO service_role;

ALTER TABLE public.web_page_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read templates"
  ON public.web_page_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins manage templates"
  ON public.web_page_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_web_page_templates_updated_at
  BEFORE UPDATE ON public.web_page_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tenant-scoped saved blocks library
CREATE TABLE IF NOT EXISTS public.tenant_saved_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label text NOT NULL,
  section_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  preview_image_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_saved_blocks_tenant
  ON public.tenant_saved_blocks(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_saved_blocks TO authenticated;
GRANT ALL ON public.tenant_saved_blocks TO service_role;

ALTER TABLE public.tenant_saved_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members read saved blocks"
  ON public.tenant_saved_blocks FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Tenant admins/marketers manage saved blocks"
  ON public.tenant_saved_blocks FOR ALL
  TO authenticated
  USING (
    public.is_tenant_admin_or_manager(tenant_id, auth.uid())
    OR public.is_tenant_marketing_member(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_tenant_admin_or_manager(tenant_id, auth.uid())
    OR public.is_tenant_marketing_member(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_tenant_saved_blocks_updated_at
  BEFORE UPDATE ON public.tenant_saved_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
