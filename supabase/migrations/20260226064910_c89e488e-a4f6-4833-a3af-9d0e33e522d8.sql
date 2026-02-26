
ALTER FUNCTION public.should_notify(_user_id UUID, _type TEXT, _channel TEXT) SET search_path = public;
ALTER FUNCTION public.notify_redemption_status() SET search_path = public;
ALTER FUNCTION public.notify_new_challenge() SET search_path = public;
ALTER FUNCTION public.email_redemption_status() SET search_path = public;
ALTER FUNCTION public.email_new_challenge() SET search_path = public;
