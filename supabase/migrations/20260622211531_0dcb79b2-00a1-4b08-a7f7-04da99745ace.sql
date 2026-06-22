
-- Wave 1.1: provider_inquiries triage workflow
ALTER TABLE public.provider_inquiries
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handled_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.provider_inquiries
  DROP CONSTRAINT IF EXISTS provider_inquiries_status_check;

ALTER TABLE public.provider_inquiries
  ADD CONSTRAINT provider_inquiries_status_check
  CHECK (status IN ('new','contacted','qualified','closed'));

CREATE INDEX IF NOT EXISTS provider_inquiries_status_idx
  ON public.provider_inquiries(status);

-- updated_at trigger (reuse existing helper if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace
  ) THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SET search_path = public
    AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS provider_inquiries_updated_at ON public.provider_inquiries;
CREATE TRIGGER provider_inquiries_updated_at
  BEFORE UPDATE ON public.provider_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-stamp handled_at/handled_by on status transition away from 'new'
CREATE OR REPLACE FUNCTION public.provider_inquiries_stamp_handled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'new' THEN
    IF NEW.handled_at IS NULL THEN NEW.handled_at := now(); END IF;
    IF NEW.handled_by IS NULL THEN NEW.handled_by := auth.uid(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS provider_inquiries_stamp_handled_trg ON public.provider_inquiries;
CREATE TRIGGER provider_inquiries_stamp_handled_trg
  BEFORE UPDATE ON public.provider_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.provider_inquiries_stamp_handled();
