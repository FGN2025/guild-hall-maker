
-- Ecosystem sync log
CREATE TABLE public.ecosystem_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_app text NOT NULL,
  data_type text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  records_synced integer DEFAULT 0,
  status text DEFAULT 'success',
  error_message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ecosystem_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ecosystem sync logs" ON public.ecosystem_sync_log FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ecosystem webhooks
CREATE TABLE public.ecosystem_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_app text NOT NULL,
  event_type text NOT NULL,
  webhook_url text NOT NULL,
  secret_key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ecosystem_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ecosystem webhooks" ON public.ecosystem_webhooks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Career path mappings
CREATE TABLE public.career_path_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games(id),
  challenge_id uuid REFERENCES public.challenges(id),
  target_app text NOT NULL,
  external_path_id text NOT NULL,
  external_module_id text,
  credit_type text DEFAULT 'completion',
  credit_value numeric DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.career_path_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage career path mappings" ON public.career_path_mappings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view career path mappings" ON public.career_path_mappings FOR SELECT USING (true);
