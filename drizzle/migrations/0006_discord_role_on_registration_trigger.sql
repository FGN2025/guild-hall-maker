CREATE OR REPLACE FUNCTION public.assign_discord_role_on_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tournaments WHERE id = NEW.tournament_id AND discord_role_id IS NOT NULL)
     AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.user_id AND discord_id IS NOT NULL) THEN
    PERFORM net.http_post(
      url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/assign-tournament-role',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('registration_id', NEW.id)
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_assign_discord_role_on_registration ON public.tournament_registrations;
CREATE TRIGGER trg_assign_discord_role_on_registration
AFTER INSERT ON public.tournament_registrations
FOR EACH ROW EXECUTE FUNCTION public.assign_discord_role_on_registration();