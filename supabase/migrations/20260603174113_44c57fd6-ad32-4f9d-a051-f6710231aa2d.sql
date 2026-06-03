
CREATE TABLE public.calendar_monthly_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  image_url text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

GRANT SELECT ON public.calendar_monthly_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_monthly_images TO authenticated;
GRANT ALL ON public.calendar_monthly_images TO service_role;

ALTER TABLE public.calendar_monthly_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view calendar images"
  ON public.calendar_monthly_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert calendar images"
  ON public.calendar_monthly_images FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update calendar images"
  ON public.calendar_monthly_images FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete calendar images"
  ON public.calendar_monthly_images FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_calendar_monthly_images_updated_at
  BEFORE UPDATE ON public.calendar_monthly_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for the calendar-images bucket (bucket created via tool separately)
CREATE POLICY "Public read calendar-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'calendar-images');

CREATE POLICY "Admins upload calendar-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'calendar-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update calendar-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'calendar-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete calendar-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'calendar-images' AND public.has_role(auth.uid(), 'admin'::app_role));
