-- Extend the column-level grant to the token-health columns added in 20260912195534;
-- the security_invoker view exposes them, but the 20260906195315 grant predates them.
GRANT SELECT (token_checked_at, token_check_error)
  ON public.social_connections TO authenticated;

GRANT ALL ON public.social_connections TO service_role;