
-- 1. Tracking columns on player_achievements
ALTER TABLE public.player_achievements
  ADD COLUMN IF NOT EXISTS academy_synced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS academy_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS academy_sync_note text,
  ADD COLUMN IF NOT EXISTS academy_sync_attempts integer NOT NULL DEFAULT 0;

-- 2. Create queues (idempotent)
DO $$ BEGIN
  PERFORM pgmq.create('academy_achievement_sync');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM pgmq.create('academy_achievement_sync_dlq');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. Enqueue helper
CREATE OR REPLACE FUNCTION public.enqueue_academy_achievement_sync(_user_id uuid, _achievement_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgmq.send('academy_achievement_sync', jsonb_build_object(
    'user_id', _user_id,
    'achievement_id', _achievement_id,
    'enqueued_at', now()
  ));
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create('academy_achievement_sync');
  RETURN pgmq.send('academy_achievement_sync', jsonb_build_object(
    'user_id', _user_id,
    'achievement_id', _achievement_id,
    'enqueued_at', now()
  ));
END;
$$;

-- 4. AFTER INSERT trigger on player_achievements
CREATE OR REPLACE FUNCTION public.trg_enqueue_academy_achievement_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.academy_synced, false) IS NOT TRUE THEN
    PERFORM public.enqueue_academy_achievement_sync(NEW.user_id, NEW.achievement_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_academy_achievement_sync ON public.player_achievements;
CREATE TRIGGER trg_enqueue_academy_achievement_sync
  AFTER INSERT ON public.player_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enqueue_academy_achievement_sync();

-- 5. Extend stats RPC to include achievement queue counts (backwards compatible)
CREATE OR REPLACE FUNCTION public.get_academy_queue_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pending bigint := 0;
  _dlq bigint := 0;
  _oldest_age_seconds numeric := null;
  _ach_pending bigint := 0;
  _ach_dlq bigint := 0;
  _ach_oldest numeric := null;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  BEGIN
    SELECT count(*) INTO _pending FROM pgmq.q_academy_sync;
    SELECT extract(epoch FROM (now() - min(enqueued_at)))
      INTO _oldest_age_seconds FROM pgmq.q_academy_sync;
  EXCEPTION WHEN undefined_table THEN _pending := 0; END;

  BEGIN
    SELECT count(*) INTO _dlq FROM pgmq.q_academy_sync_dlq;
  EXCEPTION WHEN undefined_table THEN _dlq := 0; END;

  BEGIN
    SELECT count(*) INTO _ach_pending FROM pgmq.q_academy_achievement_sync;
    SELECT extract(epoch FROM (now() - min(enqueued_at)))
      INTO _ach_oldest FROM pgmq.q_academy_achievement_sync;
  EXCEPTION WHEN undefined_table THEN _ach_pending := 0; END;

  BEGIN
    SELECT count(*) INTO _ach_dlq FROM pgmq.q_academy_achievement_sync_dlq;
  EXCEPTION WHEN undefined_table THEN _ach_dlq := 0; END;

  RETURN jsonb_build_object(
    'pending', _pending,
    'dlq', _dlq,
    'oldest_age_seconds', _oldest_age_seconds,
    'achievement_pending', _ach_pending,
    'achievement_dlq', _ach_dlq,
    'achievement_oldest_age_seconds', _ach_oldest
  );
END;
$$;
