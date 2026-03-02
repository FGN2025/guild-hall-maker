
-- 1. Create access_requests table
CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name text,
  zip_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Admins can manage all requests
CREATE POLICY "Admins can manage access requests"
  ON public.access_requests FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone (including anon) can insert access requests
CREATE POLICY "Anyone can submit access requests"
  ON public.access_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Trigger to notify admins on new access request
CREATE OR REPLACE FUNCTION public.notify_admins_access_request()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid;
BEGIN
  FOR _uid IN
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      _uid,
      'info',
      'New Access Request',
      NEW.display_name || ' (' || NEW.email || ') from ZIP ' || NEW.zip_code || ' is requesting access.',
      '/admin/access-requests'
    );
  END LOOP;

  -- Fire email notification to admins
  PERFORM net.http_post(
    url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-notification-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI"}'::jsonb,
    body := jsonb_build_object(
      'type', 'access_request_new',
      'record', to_jsonb(NEW)
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_access_request_insert
  AFTER INSERT ON public.access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_access_request();
