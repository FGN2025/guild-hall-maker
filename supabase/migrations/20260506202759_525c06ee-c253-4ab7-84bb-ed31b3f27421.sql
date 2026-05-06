CREATE OR REPLACE FUNCTION public.prevent_player_tenant_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Platform staff are always exempt
  IF public.has_role(NEW.user_id, 'admin'::app_role)
     OR public.has_role(NEW.user_id, 'moderator'::app_role)
     OR public.has_role(NEW.user_id, 'marketing'::app_role) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_service_interests WHERE user_id = NEW.user_id)
     OR EXISTS (SELECT 1 FROM public.tenant_subscribers WHERE user_id = NEW.user_id)
     OR EXISTS (SELECT 1 FROM public.legacy_users WHERE matched_user_id = NEW.user_id)
     OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.user_id AND zip_code IS NOT NULL AND length(trim(zip_code)) > 0)
  THEN
    RAISE EXCEPTION 'This user is registered as a player and cannot be added to a tenant team.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;