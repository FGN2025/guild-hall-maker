
CREATE TABLE public.game_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  game text NOT NULL,
  ip_address text NOT NULL,
  port integer,
  description text,
  image_url text,
  max_players integer,
  connection_instructions text,
  panel_type text,
  panel_url text,
  panel_server_id text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active servers"
  ON public.game_servers FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage game servers"
  ON public.game_servers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
