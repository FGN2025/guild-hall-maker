
-- Coach player profiles
CREATE TABLE public.coach_player_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  notes text,
  stats_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_player_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own coach profile"
  ON public.coach_player_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own coach profile"
  ON public.coach_player_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own coach profile"
  ON public.coach_player_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Coach player files
CREATE TABLE public.coach_player_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  extracted_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_player_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own coach files"
  ON public.coach_player_files FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own coach files"
  ON public.coach_player_files FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own coach files"
  ON public.coach_player_files FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Updated_at trigger for profiles
CREATE TRIGGER set_coach_profile_updated_at
  BEFORE UPDATE ON public.coach_player_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for coach uploads (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('coach-uploads', 'coach-uploads', false);

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Users can upload coach files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'coach-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own coach files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'coach-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own coach files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'coach-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
