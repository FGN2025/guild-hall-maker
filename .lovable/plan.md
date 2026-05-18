## P1 #4 — Per-Tenant Sync Health Surface (SHIPPED)

Sync activity log now carries `tenant_id`, so CSPs (tenant admins) can see only their tenant's delivery health and platform admins can filter the global card by tenant.

### What shipped

- **Schema**: `ecosystem_sync_log.tenant_id uuid` + index; RLS policy `Tenant admins read their sync logs` (via `is_tenant_admin`).
- **RPC**: `get_tenant_sync_health(_tenant_id uuid default null, _hours int default 24)` SECURITY DEFINER — admin can pass null for all tenants; tenant admins are restricted to their own.
- **Edge fns**: `ecosystem-webhook-dispatch` reads `tenant_id` from request body or `payload.metadata.tenant_id` and writes it into both log inserts. All four `sync-*-to-academy` workers now pass `tenant_id: tenantId` alongside `event_type` / `payload`.
- **Admin UI**: `EcosystemSyncHealth.tsx` got a "Tenant filter" `<Select>` (All tenants / per-tenant). Queue stats card is hidden when a specific tenant is selected; data grid switches to the RPC.
- **Tenant UI**: New `src/components/tenant/TenantSyncHealth.tsx`, mounted in `TenantDashboard.tsx`. Auto-hides when there's no activity in the last 24h.

### Rollback

```sql
drop policy "Tenant admins read their sync logs" on public.ecosystem_sync_log;
drop function public.get_tenant_sync_health(uuid, int);
alter table public.ecosystem_sync_log drop column tenant_id;
```

### Next

P1 #5 quest-chain bonus event (`quest_chain.completed`) reusing the existing pgmq pattern — emits the chain-bonus moment that's currently invisible to Academy.
