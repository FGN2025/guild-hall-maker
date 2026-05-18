
-- 1. Add tenant_id column + index
alter table public.ecosystem_sync_log
  add column if not exists tenant_id uuid;

create index if not exists idx_ecosystem_sync_log_tenant
  on public.ecosystem_sync_log(tenant_id, created_at desc);

-- 2. RLS: tenant admins can read their own tenant's rows
drop policy if exists "Tenant admins read their sync logs" on public.ecosystem_sync_log;
create policy "Tenant admins read their sync logs"
  on public.ecosystem_sync_log
  for select
  using (tenant_id is not null and public.is_tenant_admin(tenant_id, auth.uid()));

-- 3. RPC: per-tenant sync health rollup
create or replace function public.get_tenant_sync_health(
  _tenant_id uuid default null,
  _hours int default 24
)
returns table(
  tenant_id uuid,
  data_type text,
  total bigint,
  failures bigint,
  last_success timestamptz,
  last_error text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if _tenant_id is null and not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'not authorized';
  end if;

  if _tenant_id is not null
     and not public.has_role(auth.uid(), 'admin'::app_role)
     and not public.is_tenant_admin(_tenant_id, auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select
    l.tenant_id,
    l.data_type,
    count(*)::bigint as total,
    count(*) filter (where l.status <> 'success')::bigint as failures,
    max(l.created_at) filter (where l.status = 'success') as last_success,
    (array_agg(l.error_message order by l.created_at desc)
       filter (where l.status <> 'success' and l.error_message is not null))[1] as last_error
  from public.ecosystem_sync_log l
  where l.created_at >= now() - make_interval(hours => _hours)
    and (_tenant_id is null or l.tenant_id = _tenant_id)
  group by l.tenant_id, l.data_type;
end;
$$;

grant execute on function public.get_tenant_sync_health(uuid, int) to authenticated;
