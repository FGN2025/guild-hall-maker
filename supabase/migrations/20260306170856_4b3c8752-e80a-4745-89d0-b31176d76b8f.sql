
-- Create tenant_codes table
CREATE TABLE public.tenant_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  code_type text NOT NULL DEFAULT 'campaign' CHECK (code_type IN ('campaign', 'override', 'access', 'tracking')),
  max_uses integer,
  times_used integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- Enable RLS
ALTER TABLE public.tenant_codes ENABLE ROW LEVEL SECURITY;

-- Platform admins: full access
CREATE POLICY "Platform admins full access on tenant_codes"
  ON public.tenant_codes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tenant admins: full CRUD on own tenant codes
CREATE POLICY "Tenant admins can manage own codes"
  ON public.tenant_codes FOR ALL
  USING (public.is_tenant_admin(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));

-- Tenant marketing: read-only on own tenant codes
CREATE POLICY "Tenant marketing can view own codes"
  ON public.tenant_codes FOR SELECT
  USING (public.is_tenant_marketing_member(tenant_id, auth.uid()));
