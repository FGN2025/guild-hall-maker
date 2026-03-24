
-- Add explicit SELECT policy: only the token owner can read their own tokens
CREATE POLICY "Token owner can read own tokens"
ON public.ecosystem_auth_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Auto-delete tokens after they are marked as used
CREATE OR REPLACE FUNCTION public.cleanup_used_ecosystem_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.used = true AND OLD.used IS DISTINCT FROM NEW.used THEN
    DELETE FROM public.ecosystem_auth_tokens WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_used_ecosystem_token
AFTER UPDATE ON public.ecosystem_auth_tokens
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_used_ecosystem_token();

-- Also clean up expired tokens periodically (delete any expired + used tokens)
DELETE FROM public.ecosystem_auth_tokens
WHERE used = true OR expires_at < now();
