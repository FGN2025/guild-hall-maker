-- 1. Sync tracking columns on challenge_evidence
ALTER TABLE public.challenge_evidence
  ADD COLUMN IF NOT EXISTS academy_task_synced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS academy_task_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS academy_task_sync_note text,
  ADD COLUMN IF NOT EXISTS academy_task_sync_attempts integer NOT NULL DEFAULT 0;

-- 2. Ensure queues exist (idempotent)
DO $$ BEGIN
  PERFORM pgmq.create('academy_task_sync');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM pgmq.create('academy_task_sync_dlq');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. Enqueue helper
CREATE OR REPLACE FUNCTION public.enqueue_academy_task_sync(_evidence_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.send('academy_task_sync', jsonb_build_object(
    'evidence_id', _evidence_id,
    'enqueued_at', now()
  ));
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create('academy_task_sync');
  RETURN pgmq.send('academy_task_sync', jsonb_build_object(
    'evidence_id', _evidence_id,
    'enqueued_at', now()
  ));
END;
$function$;

-- 4. Trigger: fire when an evidence row reaches approved + has task_id + not yet synced
CREATE OR REPLACE FUNCTION public.trg_enqueue_academy_task_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.task_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.academy_task_synced, false) IS TRUE THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    -- already approved before; don't double-enqueue
    RETURN NEW;
  END IF;
  PERFORM public.enqueue_academy_task_sync(NEW.id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enqueue_academy_task_sync ON public.challenge_evidence;
CREATE TRIGGER trg_enqueue_academy_task_sync
  AFTER INSERT OR UPDATE OF status ON public.challenge_evidence
  FOR EACH ROW EXECUTE FUNCTION public.trg_enqueue_academy_task_sync();

-- 5. Extend queue stats helper with task queue
CREATE OR REPLACE FUNCTION public.get_academy_queue_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _pending bigint := 0;
  _dlq bigint := 0;
  _oldest_age_seconds numeric := null;
  _ach_pending bigint := 0;
  _ach_dlq bigint := 0;
  _ach_oldest numeric := null;
  _quest_pending bigint := 0;
  _quest_dlq bigint := 0;
  _quest_oldest numeric := null;
  _task_pending bigint := 0;
  _task_dlq bigint := 0;
  _task_oldest numeric := null;
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

  BEGIN
    SELECT count(*) INTO _quest_pending FROM pgmq.q_academy_quest_sync;
    SELECT extract(epoch FROM (now() - min(enqueued_at)))
      INTO _quest_oldest FROM pgmq.q_academy_quest_sync;
  EXCEPTION WHEN undefined_table THEN _quest_pending := 0; END;

  BEGIN
    SELECT count(*) INTO _quest_dlq FROM pgmq.q_academy_quest_sync_dlq;
  EXCEPTION WHEN undefined_table THEN _quest_dlq := 0; END;

  BEGIN
    SELECT count(*) INTO _task_pending FROM pgmq.q_academy_task_sync;
    SELECT extract(epoch FROM (now() - min(enqueued_at)))
      INTO _task_oldest FROM pgmq.q_academy_task_sync;
  EXCEPTION WHEN undefined_table THEN _task_pending := 0; END;

  BEGIN
    SELECT count(*) INTO _task_dlq FROM pgmq.q_academy_task_sync_dlq;
  EXCEPTION WHEN undefined_table THEN _task_dlq := 0; END;

  RETURN jsonb_build_object(
    'pending', _pending,
    'dlq', _dlq,
    'oldest_age_seconds', _oldest_age_seconds,
    'achievement_pending', _ach_pending,
    'achievement_dlq', _ach_dlq,
    'achievement_oldest_age_seconds', _ach_oldest,
    'quest_pending', _quest_pending,
    'quest_dlq', _quest_dlq,
    'quest_oldest_age_seconds', _quest_oldest,
    'task_pending', _task_pending,
    'task_dlq', _task_dlq,
    'task_oldest_age_seconds', _task_oldest
  );
END;
$function$;