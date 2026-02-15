
-- Create tenant_subscribers table
CREATE TABLE public.tenant_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_number TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  zip_code TEXT,
  service_status TEXT DEFAULT 'active',
  plan_name TEXT,
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate imports
CREATE UNIQUE INDEX idx_tenant_subscribers_unique_external 
  ON public.tenant_subscribers (tenant_id, source, external_id) 
  WHERE external_id IS NOT NULL;

-- Index for tenant lookups
CREATE INDEX idx_tenant_subscribers_tenant ON public.tenant_subscribers(tenant_id);

-- Enable RLS
ALTER TABLE public.tenant_subscribers ENABLE ROW LEVEL SECURITY;

-- Tenant admins can manage their own subscribers
CREATE POLICY "Tenant admins can manage their subscribers"
  ON public.tenant_subscribers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tenant_admins ta
    WHERE ta.tenant_id = tenant_subscribers.tenant_id AND ta.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_admins ta
    WHERE ta.tenant_id = tenant_subscribers.tenant_id AND ta.user_id = auth.uid()
  ));

-- Super admins can manage all subscribers
CREATE POLICY "Admins can manage all subscribers"
  ON public.tenant_subscribers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_tenant_subscribers_updated_at
  BEFORE UPDATE ON public.tenant_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create tenant_integrations table
CREATE TABLE public.tenant_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL,
  display_name TEXT,
  api_url TEXT,
  api_key_encrypted TEXT,
  additional_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_integrations_tenant ON public.tenant_integrations(tenant_id);

-- Enable RLS
ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;

-- Tenant admins can manage their integrations (but api_key_encrypted is write-only via app logic)
CREATE POLICY "Tenant admins can manage their integrations"
  ON public.tenant_integrations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tenant_admins ta
    WHERE ta.tenant_id = tenant_integrations.tenant_id AND ta.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_admins ta
    WHERE ta.tenant_id = tenant_integrations.tenant_id AND ta.user_id = auth.uid()
  ));

-- Super admins can manage all integrations
CREATE POLICY "Admins can manage all integrations"
  ON public.tenant_integrations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
