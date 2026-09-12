alter table public.tenant_marketing_assets add column if not exists idempotency_key text;

update public.tenant_marketing_assets
set idempotency_key = 'legacy:v1:' || file_path
where idempotency_key is null and file_path is not null;

create unique index if not exists tenant_marketing_assets_tenant_idem_uidx
on public.tenant_marketing_assets (tenant_id, idempotency_key)
where idempotency_key is not null;