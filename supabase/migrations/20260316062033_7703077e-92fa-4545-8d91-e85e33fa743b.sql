
CREATE TABLE public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text,
  product_id text,
  price_id text,
  status text NOT NULL DEFAULT 'pending',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- Tenant admins can read their own subscriptions
CREATE POLICY "Tenant admins can read own subscriptions"
  ON public.tenant_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_admin(tenant_id, auth.uid())
  );

-- Platform admins can read all subscriptions
CREATE POLICY "Platform admins can read all subscriptions"
  ON public.tenant_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Platform admins can insert/update subscriptions
CREATE POLICY "Platform admins can manage subscriptions"
  ON public.tenant_subscriptions
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

-- Trigger to update updated_at
CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
