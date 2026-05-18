## P1 #4 — Per-Tenant Sync Health Surface

Break out the Sync Health card so a CSP (tenant admin) can see only their tenant's sync activity, while platform admins can filter the existing card by tenant.

### What's missing today

- `ecosystem_sync_log` has no `tenant_id`, so every row is global — there's no way to scope health to one tenant.
- `EcosystemSyncHealth` is admin-only and renders global numbers; tenant admins have no visibility into whether their players' completions are reaching Academy.
- pgmq queue rows don't carry tenant context, so queue depth stays global. That's acceptable — queue stats are an ops signal, not a CSP signal.

### What ships

**1. Tag the sync log with tenant_id**
- Add nullable `tenant_id uuid` + index on `ecosystem_sync_log`.
- RLS: keep admin full-access policy; add `Tenant admins can read their tenant rows` (uses `is_tenant_admin(auth.uid(), tenant_id)`).
- `ecosystem-webhook-dispatch` accepts `tenant_id` (top-level or `payload.metadata.tenant_id`) and writes it on every log insert (success + failure branches + per-row error branch).
- All four `sync-*-to-academy` workers already resolve `tenantId` — pass it through the dispatch call.

**2. RPC for grouped tenant rollup**
- `get_tenant_sync_health(_tenant_id uuid default null, _hours int default 24)` SECURITY DEFINER, returns one row per `(tenant_id, data_type)` with `total`, `failures`, `last_success`, `last_error`. When `_tenant_id` is null, returns all tenants (admin-only check inside the function). When set, callable by that tenant's admin.

**3. Admin UI — extend existing card**
- Add a tenant filter `<Select>` above the per-data-type grid in `EcosystemSyncHealth.tsx`. "All tenants" (default) or any tenant from `useTenants()`. Queue stats card stays global.
- When a tenant is selected, fetch via the new RPC instead of the raw `ecosystem_sync_log` query, and re-group by `data_type`.

**4. Tenant UI — new scoped panel**
- New `src/components/tenant/TenantSyncHealth.tsx`: same `data_type` grid (no queue stats), hard-scoped to the current tenant via the RPC. No filter — just shows their rows.
- Mount in `TenantDashboard.tsx` under existing sections. Hidden when zero activity in 24h to avoid visual noise.

**5. Out of scope**
- Backfilling historical `ecosystem_sync_log` rows (we leave them with `tenant_id = null` — they show only under "All tenants").
- Per-tenant queue depth (would require sticking tenant_id inside pgmq message bodies and a scan-time aggregator — not worth it for this surface).
- Surfacing the inbound `passport-link` / non-academy webhooks per tenant (those aren't tenant-scoped events).

### Technical detail

**Migration**
```sql
alter table public.ecosystem_sync_log add column tenant_id uuid;
create index idx_ecosystem_sync_log_tenant on public.ecosystem_sync_log(tenant_id, created_at desc);

create policy "Tenant admins read their sync logs"
  on public.ecosystem_sync_log for select
  using (tenant_id is not null and public.is_tenant_admin(auth.uid(), tenant_id));

create or replace function public.get_tenant_sync_health(_tenant_id uuid default null, _hours int default 24)
returns table(tenant_id uuid, data_type text, total bigint, failures bigint, last_success timestamptz, last_error text)
language plpgsql stable security definer set search_path = public as $$
begin
  if _tenant_id is null and not has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;
  if _tenant_id is not null
     and not has_role(auth.uid(), 'admin')
     and not is_tenant_admin(auth.uid(), _tenant_id) then
    raise exception 'forbidden';
  end if;

  return query
  select l.tenant_id, l.data_type,
         count(*)::bigint as total,
         count(*) filter (where l.status <> 'success')::bigint as failures,
         max(l.created_at) filter (where l.status = 'success') as last_success,
         (array_agg(l.error_message order by l.created_at desc)
            filter (where l.status <> 'success'))[1] as last_error
  from public.ecosystem_sync_log l
  where l.created_at >= now() - make_interval(hours => _hours)
    and (_tenant_id is null or l.tenant_id = _tenant_id)
  group by l.tenant_id, l.data_type;
end $$;
```

**Edge fn changes**
- `ecosystem-webhook-dispatch`: read `body.tenant_id ?? payload?.metadata?.tenant_id`, include in both `ecosystem_sync_log.insert` calls.
- `sync-challenge-to-academy`, `sync-achievement-to-academy`, `sync-quest-to-academy`, `sync-challenge-task-to-academy`: add `tenant_id: tenantId` to the dispatch invoke body (sibling of `event_type` / `payload`).

**UI changes**
- `src/components/admin/EcosystemSyncHealth.tsx`: add `selectedTenantId` state + `<Select>`; when set, call `supabase.rpc('get_tenant_sync_health', { _tenant_id })` and re-map into existing `HealthRow[]`. Keep current behaviour for "All tenants".
- `src/components/tenant/TenantSyncHealth.tsx` (new): minimal version of the same card, no queue stats, calls RPC with the active tenant id from existing tenant context.
- `src/pages/tenant/TenantDashboard.tsx`: render `<TenantSyncHealth />` near the bottom.

### Rollback

```sql
drop policy "Tenant admins read their sync logs" on public.ecosystem_sync_log;
drop function public.get_tenant_sync_health;
alter table public.ecosystem_sync_log drop column tenant_id;
```
UI guard: tenant card simply renders nothing if the RPC is missing.

### Files

- new migration (schema + RPC + policy)
- edit `supabase/functions/ecosystem-webhook-dispatch/index.ts`
- edit `supabase/functions/sync-{challenge,achievement,quest,challenge-task}-to-academy/index.ts`
- edit `src/components/admin/EcosystemSyncHealth.tsx`
- new `src/components/tenant/TenantSyncHealth.tsx`
- edit `src/pages/tenant/TenantDashboard.tsx`
- edit `.lovable/plan.md`
