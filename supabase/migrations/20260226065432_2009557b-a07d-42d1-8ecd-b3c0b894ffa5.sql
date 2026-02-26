
-- 1. Tournament Starting: when tournament status changes to 'in_progress'
CREATE OR REPLACE FUNCTION public.notify_tournament_starting()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID;
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM NEW.status THEN
    FOR _uid IN
      SELECT user_id FROM public.tournament_registrations
      WHERE tournament_id = NEW.id AND status = 'registered'
    LOOP
      IF public.should_notify(_uid, 'tournament_starting', 'in_app') THEN
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (_uid, 'info', 'Tournament Starting Now!',
          '"' || NEW.name || '" is now live — head over and compete!',
          '/tournaments/' || NEW.id);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tournament_starting
  AFTER UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.notify_tournament_starting();

-- 2. Registration Confirmed: when player registers for a tournament
CREATE OR REPLACE FUNCTION public.notify_registration_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tname TEXT;
BEGIN
  SELECT name INTO _tname FROM public.tournaments WHERE id = NEW.tournament_id;
  IF public.should_notify(NEW.user_id, 'registration_confirmed', 'in_app') THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.user_id, 'success', 'Registration Confirmed',
      'You are registered for "' || _tname || '". Good luck!',
      '/tournaments/' || NEW.tournament_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_registration_confirmed
  AFTER INSERT ON public.tournament_registrations
  FOR EACH ROW EXECUTE FUNCTION public.notify_registration_confirmed();

-- 3. Match Completed: notify both players when match result is recorded
CREATE OR REPLACE FUNCTION public.notify_match_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tname TEXT;
  _uid UUID;
  _msg TEXT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT t.name INTO _tname FROM public.tournaments t WHERE t.id = NEW.tournament_id;

    FOREACH _uid IN ARRAY ARRAY[NEW.player1_id, NEW.player2_id] LOOP
      IF _uid IS NOT NULL AND public.should_notify(_uid, 'match_completed', 'in_app') THEN
        IF _uid = NEW.winner_id THEN
          _msg := 'You won your Round ' || NEW.round || ' match in "' || _tname || '"! 🎉';
        ELSE
          _msg := 'Your Round ' || NEW.round || ' match in "' || _tname || '" has concluded.';
        END IF;

        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (_uid,
          CASE WHEN _uid = NEW.winner_id THEN 'success' ELSE 'info' END,
          'Match Result',
          _msg,
          '/tournaments/' || NEW.tournament_id || '/bracket');
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_match_completed
  AFTER UPDATE ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.notify_match_completed();

-- 4. Achievement Earned: notify player when they receive an achievement
CREATE OR REPLACE FUNCTION public.notify_achievement_earned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _aname TEXT;
  _tier TEXT;
BEGIN
  SELECT name, tier INTO _aname, _tier
  FROM public.achievement_definitions WHERE id = NEW.achievement_id;

  IF public.should_notify(NEW.user_id, 'achievement_earned', 'in_app') THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.user_id, 'success', 'Achievement Unlocked!',
      'You earned the ' || initcap(_tier) || ' achievement: "' || _aname || '"! 🏆',
      '/achievements');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_achievement_earned
  AFTER INSERT ON public.player_achievements
  FOR EACH ROW EXECUTE FUNCTION public.notify_achievement_earned();
