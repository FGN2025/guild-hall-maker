CREATE OR REPLACE FUNCTION public.prevent_player_tenant_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Platform admins are always exempt
  IF public.has_role(NEW.user_id, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_service_interests WHERE user_id = NEW.user_id)
     OR EXISTS (SELECT 1 FROM public.tenant_subscribers WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'This user is registered as a player and cannot be added to a tenant team.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_player_tenant_admin ON public.tenant_admins;
CREATE TRIGGER trg_prevent_player_tenant_admin
BEFORE INSERT OR UPDATE OF user_id, role ON public.tenant_admins
FOR EACH ROW EXECUTE FUNCTION public.prevent_player_tenant_admin();