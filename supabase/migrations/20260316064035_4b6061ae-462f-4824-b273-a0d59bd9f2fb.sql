
CREATE TABLE public.subscriber_cloud_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES public.tenant_subscribers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  canceled_at timestamptz,
  UNIQUE (tenant_id, subscriber_id)
);

ALTER TABLE public.subscriber_cloud_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view purchases"
  ON public.subscriber_cloud_purchases FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));

CREATE POLICY "Tenant admins can insert purchases"
  ON public.subscriber_cloud_purchases FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));

CREATE POLICY "Tenant admins can update purchases"
  ON public.subscriber_cloud_purchases FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()));

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscriber_cloud_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
