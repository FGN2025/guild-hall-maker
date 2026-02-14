
-- Tenant admins table (links users to tenants they manage)
CREATE TABLE public.tenant_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.tenant_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tenant admins" ON public.tenant_admins FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant admins can view own record" ON public.tenant_admins FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
