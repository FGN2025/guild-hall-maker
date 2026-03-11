
-- Social connections table for storing platform credentials
CREATE TABLE public.social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin')),
  account_name text,
  page_id text,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Users can manage their own connections
CREATE POLICY "Users manage own social connections"
  ON public.social_connections FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tenant members can view connections for their tenant
CREATE POLICY "Tenant members view connections"
  ON public.social_connections FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));

-- Scheduled posts table
CREATE TABLE public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  connection_id uuid REFERENCES public.social_connections(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin')),
  image_url text NOT NULL,
  caption text DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'cancelled')),
  published_at timestamptz,
  post_url text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Users manage their own scheduled posts
CREATE POLICY "Users manage own scheduled posts"
  ON public.scheduled_posts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tenant members can view scheduled posts for their tenant
CREATE POLICY "Tenant members view scheduled posts"
  ON public.scheduled_posts FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
