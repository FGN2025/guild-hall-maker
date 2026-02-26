
-- Helper function
CREATE OR REPLACE FUNCTION public.is_tenant_marketing_member(
  _tenant_id uuid, _user_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_admins
    WHERE tenant_id = _tenant_id
      AND user_id = _user_id
      AND role IN ('admin', 'marketing')
  )
$$;

-- New table
CREATE TABLE public.tenant_marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_asset_id uuid REFERENCES public.marketing_assets(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  url text NOT NULL,
  label text NOT NULL DEFAULT 'Default',
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_marketing_assets ENABLE ROW LEVEL SECURITY;

-- Super Admins: full access
CREATE POLICY "Super admins full access"
  ON public.tenant_marketing_assets FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Tenant admin/marketing: full CRUD on own tenant's assets
CREATE POLICY "Tenant admin and marketing can manage"
  ON public.tenant_marketing_assets FOR ALL
  USING (is_tenant_marketing_member(tenant_id, auth.uid()))
  WITH CHECK (is_tenant_marketing_member(tenant_id, auth.uid()));
