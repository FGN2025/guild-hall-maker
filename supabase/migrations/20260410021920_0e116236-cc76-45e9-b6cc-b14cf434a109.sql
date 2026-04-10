
CREATE TABLE public.provider_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'other',
  message TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a provider inquiry"
  ON public.provider_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
