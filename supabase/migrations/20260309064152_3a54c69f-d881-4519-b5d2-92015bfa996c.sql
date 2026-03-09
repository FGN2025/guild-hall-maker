-- Add discord_bypass_approved flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_bypass_approved boolean NOT NULL DEFAULT false;

-- Create discord bypass requests table
CREATE TABLE IF NOT EXISTS public.discord_bypass_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.discord_bypass_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own request
CREATE POLICY "Users can insert own bypass request"
  ON public.discord_bypass_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read own request
CREATE POLICY "Users can read own bypass request"
  ON public.discord_bypass_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all requests
CREATE POLICY "Admins can read all bypass requests"
  ON public.discord_bypass_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update bypass requests
CREATE POLICY "Admins can update bypass requests"
  ON public.discord_bypass_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- When admin approves, set profile flag via trigger
CREATE OR REPLACE FUNCTION public.handle_discord_bypass_approval()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.profiles SET discord_bypass_approved = true WHERE user_id = NEW.user_id;
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.user_id, 'success', 'Access Approved', 'Your manual verification request has been approved. You can now access the platform.', '/dashboard');
  ELSIF NEW.status = 'denied' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.user_id, 'warning', 'Verification Denied', 'Your manual verification request was denied. Please link your Discord account to proceed.', '/link-discord');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_discord_bypass_status_change
  BEFORE UPDATE ON public.discord_bypass_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_discord_bypass_approval();