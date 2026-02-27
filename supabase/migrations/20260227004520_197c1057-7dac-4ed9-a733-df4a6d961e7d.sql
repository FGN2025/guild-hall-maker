
-- Create tenant_events table
CREATE TABLE public.tenant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  game text NOT NULL DEFAULT '',
  description text,
  format text NOT NULL DEFAULT 'single_elimination',
  max_participants integer NOT NULL DEFAULT 16,
  prize_pool text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  rules text,
  image_url text,
  status text NOT NULL DEFAULT 'draft',
  is_public boolean NOT NULL DEFAULT false,
  registration_open boolean NOT NULL DEFAULT false,
  social_copy text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create tenant_event_registrations table
CREATE TABLE public.tenant_event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.tenant_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'registered',
  UNIQUE(event_id, user_id)
);

-- Create tenant_event_assets table
CREATE TABLE public.tenant_event_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.tenant_events(id) ON DELETE CASCADE,
  asset_url text NOT NULL,
  label text NOT NULL DEFAULT 'Banner',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_event_assets ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger for tenant_events
CREATE TRIGGER update_tenant_events_updated_at
  BEFORE UPDATE ON public.tenant_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: tenant_events
CREATE POLICY "Tenant members can manage their events"
  ON public.tenant_events FOR ALL TO authenticated
  USING (is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (is_tenant_member(tenant_id, auth.uid()));

CREATE POLICY "Platform admins can manage all events"
  ON public.tenant_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view published events"
  ON public.tenant_events FOR SELECT TO anon, authenticated
  USING (is_public = true AND status = 'published');

-- RLS: tenant_event_registrations
CREATE POLICY "Users can register for events"
  ON public.tenant_event_registrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own registrations"
  ON public.tenant_event_registrations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can cancel own registrations"
  ON public.tenant_event_registrations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenant members can view event registrations"
  ON public.tenant_event_registrations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_events te
    WHERE te.id = event_id AND is_tenant_member(te.tenant_id, auth.uid())
  ));

CREATE POLICY "Platform admins can manage all registrations"
  ON public.tenant_event_registrations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS: tenant_event_assets
CREATE POLICY "Tenant marketing members can manage event assets"
  ON public.tenant_event_assets FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_events te
    WHERE te.id = event_id AND is_tenant_marketing_member(te.tenant_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_events te
    WHERE te.id = event_id AND is_tenant_marketing_member(te.tenant_id, auth.uid())
  ));

CREATE POLICY "Public can view assets of published events"
  ON public.tenant_event_assets FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_events te
    WHERE te.id = event_id AND te.is_public = true AND te.status = 'published'
  ));

CREATE POLICY "Platform admins can manage all event assets"
  ON public.tenant_event_assets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
