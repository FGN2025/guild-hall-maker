
-- Create admin_notebook_connections table
CREATE TABLE public.admin_notebook_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  notebook_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_health_check TIMESTAMPTZ,
  last_health_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notebook_connections ENABLE ROW LEVEL SECURITY;

-- Only admins can manage notebook connections
CREATE POLICY "Admins can manage notebook connections"
ON public.admin_notebook_connections
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_notebook_connections_updated_at
BEFORE UPDATE ON public.admin_notebook_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
