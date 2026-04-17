
-- ============================================================
-- SECURITY FIX 1: app_settings - restrict public reads to UI-safe keys only
-- Sensitive keys (ai_image_config with API URL/model, agent_* configs) become admin-only
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;

CREATE POLICY "Public can read UI settings only"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (
  key IN (
    'no_providers_message',
    'featured_video_url',
    'homepage_ticker_embed',
    'hero_logo_url',
    'hero_stats_overrides',
    'image_upload_limits',
    'discord_client_id',
    'historical_player_count_offset',
    'historical_tournament_count'
  )
);

-- Admins keep full access via existing "Admins can manage settings" policy

-- ============================================================
-- SECURITY FIX 2: tournament_registrations - require authentication to view
-- Prevents unauthenticated enumeration of user_ids tied to tournaments
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view registrations" ON public.tournament_registrations;

CREATE POLICY "Authenticated users can view registrations"
ON public.tournament_registrations
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- SECURITY FIX 3: Add SET search_path to pgmq wrapper functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;
