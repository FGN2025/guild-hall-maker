CREATE TABLE public.calendar_publish_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Tournament Calendar',
  logo_url text,
  bg_image_url text,
  primary_color text DEFAULT '#6366f1',
  accent_color text,
  show_platform_tournaments boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_publish_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active configs"
  ON public.calendar_publish_configs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage calendar configs"
  ON public.calendar_publish_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant marketing can manage own configs"
  ON public.calendar_publish_configs FOR ALL TO authenticated
  USING (is_tenant_marketing_member(tenant_id, auth.uid()))
  WITH CHECK (is_tenant_marketing_member(tenant_id, auth.uid()));