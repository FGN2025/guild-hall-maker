
-- Create app-media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('app-media', 'app-media', true);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload to app-media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'app-media');
CREATE POLICY "Anyone can view app-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'app-media');
CREATE POLICY "Uploaders can delete own app-media files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'app-media' AND auth.uid()::text = owner_id::text);

-- Media library table
CREATE TABLE public.media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio')),
  mime_type TEXT,
  file_size BIGINT,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media" ON public.media_library FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert media" ON public.media_library FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own media" ON public.media_library FOR DELETE TO authenticated USING (auth.uid() = user_id);
