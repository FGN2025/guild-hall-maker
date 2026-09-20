-- 1. Rate-limit log for public provider self-service signup
CREATE TABLE IF NOT EXISTS public.provision_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.provision_attempts TO service_role;

ALTER TABLE public.provision_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'provision_attempts'
      AND policyname = 'Admins can view provision attempts'
  ) THEN
    CREATE POLICY "Admins can view provision attempts"
      ON public.provision_attempts FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_provision_attempts_email_time
  ON public.provision_attempts (lower(email), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provision_attempts_ip_time
  ON public.provision_attempts (ip, created_at DESC);

-- 2. Quietly settle stale tournament statuses without firing announcements
ALTER TABLE public.tournaments DISABLE TRIGGER trg_discord_tournament_completed;
ALTER TABLE public.tournaments DISABLE TRIGGER trg_discord_tournament_published;
ALTER TABLE public.tournaments DISABLE TRIGGER trg_email_tournament_starting;
ALTER TABLE public.tournaments DISABLE TRIGGER trg_tournament_starting;

UPDATE public.tournaments
SET status = 'completed'
WHERE status IN ('upcoming', 'open')
  AND start_date < (now() - interval '2 days');

ALTER TABLE public.tournaments ENABLE TRIGGER trg_discord_tournament_completed;
ALTER TABLE public.tournaments ENABLE TRIGGER trg_discord_tournament_published;
ALTER TABLE public.tournaments ENABLE TRIGGER trg_email_tournament_starting;
ALTER TABLE public.tournaments ENABLE TRIGGER trg_tournament_starting;