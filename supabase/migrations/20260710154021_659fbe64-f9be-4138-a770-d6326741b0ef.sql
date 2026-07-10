CREATE TABLE public.discord_role_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  tournament_id uuid,
  discord_id text,
  role_id text,
  source text NOT NULL DEFAULT 'tournament_register',
  status text NOT NULL,
  reason text,
  http_status int,
  error_message text,
  attempt int NOT NULL DEFAULT 1,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.discord_role_action_log TO authenticated;
GRANT ALL ON public.discord_role_action_log TO service_role;

ALTER TABLE public.discord_role_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view discord role action log"
  ON public.discord_role_action_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_discord_role_action_log_created
  ON public.discord_role_action_log (created_at DESC);

CREATE INDEX idx_discord_role_action_log_retry
  ON public.discord_role_action_log (next_retry_at)
  WHERE status = 'retry_pending';

CREATE TRIGGER trg_discord_role_action_log_updated_at
  BEFORE UPDATE ON public.discord_role_action_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin RPC: re-queue a failed row for another attempt
CREATE OR REPLACE FUNCTION public.admin_retry_discord_role_action(_log_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.discord_role_action_log
     SET status = 'retry_pending',
         next_retry_at = now(),
         attempt = 1,
         error_message = NULL,
         http_status = NULL,
         updated_at = now()
   WHERE id = _log_id
     AND status = 'failed';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_retry_discord_role_action(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_retry_discord_role_action(uuid) TO authenticated;