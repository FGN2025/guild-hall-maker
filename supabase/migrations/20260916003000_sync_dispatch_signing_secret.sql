-- Keeps the vault secret 'ecosystem_dispatch_secret' (used by the
-- dispatch_marketing_webhook / dispatch_merit_challenge_webhook DB triggers
-- to sign outbound ecosystem webhooks) aligned with the user-managed
-- ECOSYSTEM_WEBHOOK_SIGNING_SECRET value. Service-role only; never returns
-- the secret itself, only whether the vault copy matches.

create or replace function public.sync_dispatch_signing_secret(p_secret text, p_apply boolean default true)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_secret is null or length(p_secret) < 32 then
    return false;
  end if;

  select id into v_id from vault.secrets where name = 'ecosystem_dispatch_secret';

  if v_id is null then
    perform vault.create_secret(p_secret, 'ecosystem_dispatch_secret');
  elsif p_apply then
    perform vault.update_secret(v_id, p_secret);
  end if;

  return exists (
    select 1
    from vault.decrypted_secrets
    where name = 'ecosystem_dispatch_secret'
      and decrypted_secret = p_secret
  );
end;
$$;

revoke all on function public.sync_dispatch_signing_secret(text, boolean) from public, anon, authenticated;
grant execute on function public.sync_dispatch_signing_secret(text, boolean) to service_role;
