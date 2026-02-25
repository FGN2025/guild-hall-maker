
-- Create sync history log table
CREATE TABLE public.tenant_sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  integration_id uuid NOT NULL REFERENCES public.tenant_integrations(id) ON DELETE CASCADE,
  provider_type text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  message text,
  records_synced integer DEFAULT 0,
  dry_run boolean DEFAULT false,
  triggered_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all sync logs"
  ON public.tenant_sync_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant admins can view their sync logs"
  ON public.tenant_sync_logs FOR SELECT
  USING (is_tenant_member(tenant_id, auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_sync_logs_integration ON public.tenant_sync_logs(integration_id, created_at DESC);
