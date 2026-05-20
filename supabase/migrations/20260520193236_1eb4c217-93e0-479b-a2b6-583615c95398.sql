drop policy if exists "Moderators can view legacy users" on public.legacy_users;

drop policy if exists "Tenant admins can view their sync logs" on public.tenant_sync_logs;
create policy "Tenant admins can view their sync logs"
on public.tenant_sync_logs for select
to authenticated
using (public.is_tenant_admin(tenant_id, auth.uid()));

alter publication supabase_realtime drop table public.tenant_sync_logs;

revoke select (api_key_encrypted) on public.tenant_integrations from authenticated, anon;

revoke select (stripe_customer_id, stripe_subscription_id) on public.subscriber_cloud_purchases from authenticated, anon;

create or replace view public.subscriber_cloud_purchases_safe
with (security_invoker=true) as
  select
    id,
    tenant_id,
    subscriber_id,
    user_id,
    status,
    canceled_at,
    created_at,
    updated_at
  from public.subscriber_cloud_purchases;

grant select on public.subscriber_cloud_purchases_safe to authenticated;

revoke select (user_id) on public.media_library from anon;

drop policy if exists "Authenticated users can create tournaments" on public.tournaments;
drop policy if exists "Creators can update their tournaments" on public.tournaments;
drop policy if exists "Creators can delete their tournaments" on public.tournaments;