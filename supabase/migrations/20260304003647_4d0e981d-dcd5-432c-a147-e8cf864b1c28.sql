
CREATE TABLE public.legacy_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_username text NOT NULL,
  email text,
  first_name text,
  last_name text,
  address text,
  zip_code text,
  discord_username text,
  birthday date,
  status text DEFAULT 'unknown',
  profile_completed boolean DEFAULT false,
  provider_name text,
  tenant_id uuid REFERENCES public.tenants(id),
  invite_code text,
  legacy_created_at timestamptz,
  matched_user_id uuid,
  matched_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.legacy_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage legacy users"
  ON public.legacy_users FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can view legacy users"
  ON public.legacy_users FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'moderator'));
