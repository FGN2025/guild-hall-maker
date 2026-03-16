
-- 1. tenant_cloud_gaming: per-tenant cloud gaming settings
CREATE TABLE public.tenant_cloud_gaming (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  blacknut_account_id text,
  max_seats integer NOT NULL DEFAULT 0,
  subscription_tier text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_cloud_gaming_tenant_unique UNIQUE (tenant_id)
);

ALTER TABLE public.tenant_cloud_gaming ENABLE ROW LEVEL SECURITY;

-- Tenant admins can view their own row
CREATE POLICY "Tenant admins can view own cloud gaming"
  ON public.tenant_cloud_gaming FOR SELECT TO authenticated
  USING (
    public.is_tenant_admin(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Tenant admins can update their own row
CREATE POLICY "Tenant admins can update own cloud gaming"
  ON public.tenant_cloud_gaming FOR UPDATE TO authenticated
  USING (
    public.is_tenant_admin(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_tenant_admin(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Platform admins can insert
CREATE POLICY "Admins can insert cloud gaming"
  ON public.tenant_cloud_gaming FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.is_tenant_admin(tenant_id, auth.uid())
  );

-- Platform admins can delete
CREATE POLICY "Admins can delete cloud gaming"
  ON public.tenant_cloud_gaming FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. cloud_games: cached Blacknut game catalog (shared)
CREATE TABLE public.cloud_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blacknut_game_id text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  cover_url text,
  genre text,
  is_active boolean NOT NULL DEFAULT true,
  deep_link_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cloud_games ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view active games
CREATE POLICY "Authenticated users can view active cloud games"
  ON public.cloud_games FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

-- Admins can manage catalog
CREATE POLICY "Admins can insert cloud games"
  ON public.cloud_games FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cloud games"
  ON public.cloud_games FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cloud games"
  ON public.cloud_games FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. subscriber_cloud_access: tracks which subscribers have cloud gaming seats
CREATE TABLE public.subscriber_cloud_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  activated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  CONSTRAINT subscriber_cloud_access_unique UNIQUE (tenant_id, user_id)
);

ALTER TABLE public.subscriber_cloud_access ENABLE ROW LEVEL SECURITY;

-- Tenant admins can view their tenant's access records
CREATE POLICY "Tenant admins can view own subscriber cloud access"
  ON public.subscriber_cloud_access FOR SELECT TO authenticated
  USING (
    public.is_tenant_admin(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
  );

-- Tenant admins can manage access
CREATE POLICY "Tenant admins can insert subscriber cloud access"
  ON public.subscriber_cloud_access FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_admin(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Tenant admins can update subscriber cloud access"
  ON public.subscriber_cloud_access FOR UPDATE TO authenticated
  USING (
    public.is_tenant_admin(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_tenant_admin(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Tenant admins can delete subscriber cloud access"
  ON public.subscriber_cloud_access FOR DELETE TO authenticated
  USING (
    public.is_tenant_admin(tenant_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
