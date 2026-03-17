
-- Create engagement_email_log table for deduplication
CREATE TABLE public.engagement_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_type TEXT NOT NULL,
  reference_id UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_engagement_email_log_user_type ON public.engagement_email_log (user_id, email_type, sent_at DESC);
CREATE INDEX idx_engagement_email_log_ref ON public.engagement_email_log (user_id, email_type, reference_id);

-- RLS: service-role only (no client access)
ALTER TABLE public.engagement_email_log ENABLE ROW LEVEL SECURITY;

-- Add last_active_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Trigger to update last_active_at on profile updates
CREATE OR REPLACE FUNCTION public.update_last_active_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles SET last_active_at = now() WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Fire on notification reads (good proxy for activity)
CREATE TRIGGER trg_update_active_on_notification_read
AFTER UPDATE OF is_read ON public.notifications
FOR EACH ROW
WHEN (NEW.is_read = true AND OLD.is_read = false)
EXECUTE FUNCTION public.update_last_active_at();
