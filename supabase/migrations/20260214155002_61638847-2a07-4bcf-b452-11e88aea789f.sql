
-- Tenants table (broadband service providers)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tenants" ON public.tenants FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can manage tenants" ON public.tenants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tenant ZIP codes (service areas)
CREATE TABLE public.tenant_zip_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  zip_code TEXT NOT NULL,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, zip_code)
);
ALTER TABLE public.tenant_zip_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tenant zips" ON public.tenant_zip_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tenant zips" ON public.tenant_zip_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_tenant_zip_codes_zip ON public.tenant_zip_codes(zip_code);

-- National ZIP codes (master reference)
CREATE TABLE public.national_zip_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code TEXT NOT NULL UNIQUE,
  city TEXT,
  state TEXT,
  county TEXT,
  latitude NUMERIC,
  longitude NUMERIC
);
ALTER TABLE public.national_zip_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read national zips" ON public.national_zip_codes FOR SELECT USING (true);
CREATE POLICY "Admins can manage national zips" ON public.national_zip_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_national_zip_codes_zip ON public.national_zip_codes(zip_code);

-- User service interests (leads)
CREATE TABLE public.user_service_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  zip_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_service_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interests" ON public.user_service_interests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interests" ON public.user_service_interests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all interests" ON public.user_service_interests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_service_interests_updated_at BEFORE UPDATE ON public.user_service_interests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bypass codes table
CREATE TABLE public.bypass_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  max_uses INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bypass_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bypass codes" ON public.bypass_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add ZIP to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Validate bypass code (security definer)
CREATE OR REPLACE FUNCTION public.validate_bypass_code(_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _record RECORD;
BEGIN
  SELECT * INTO _record FROM public.bypass_codes
  WHERE code = _code AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;
  IF _record.expires_at IS NOT NULL AND _record.expires_at < now() THEN RETURN false; END IF;
  IF _record.max_uses IS NOT NULL AND _record.times_used >= _record.max_uses THEN RETURN false; END IF;

  UPDATE public.bypass_codes SET times_used = times_used + 1 WHERE id = _record.id;
  RETURN true;
END;
$$;

-- Lookup providers by ZIP (security definer)
CREATE OR REPLACE FUNCTION public.lookup_providers_by_zip(_zip TEXT)
RETURNS TABLE(tenant_id UUID, tenant_name TEXT, tenant_slug TEXT, logo_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name, t.slug, t.logo_url
  FROM tenant_zip_codes tz
  JOIN tenants t ON t.id = tz.tenant_id
  WHERE tz.zip_code = _zip AND t.status = 'active';
$$;
