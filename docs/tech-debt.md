# Tracked technical debt

Items known, deliberately not fixed yet, with the trigger that makes them urgent.

## TD-001 — `marketing_assets` has no tenant-member SELECT path for unpublished campaigns

**Logged:** 2026-08-05
**Status:** open, zero impact today
**Severity when triggered:** medium (silent thumbnail failure, no error surfaced)

### What

RLS on `public.marketing_assets` grants SELECT through the parent campaign only when
that campaign is published (plus the platform-admin / creator paths). There is no
policy branch that lets a **tenant member** read assets belonging to their own
tenant's campaign while that campaign is still `draft` / `pending_review` /
`approved` (i.e. `is_published = false`).

### Why there is no impact right now

Tenant-owned campaigns store their imagery in `tenant_marketing_assets`, not
`marketing_assets`. As of 2026-08-05 there are **zero** `marketing_assets` rows
attached to any tenant-owned campaign, so nothing is being hidden.

### When it becomes a bug

The moment any tenant-owned campaign writes rows into `marketing_assets` — e.g. the
marketing agent or the Quick Promo path is changed to use the shared assets table —
tenant staff on `/tenant/marketing` will see:

- campaign cards with **no thumbnail** (the `marketing_asset_summaries` query returns
  nothing for those campaigns),
- the detail page reporting *"No assets available for this campaign"*,

with **no error toast and no console error**, because RLS filters rows silently.
The campaign row itself remains visible, which makes the failure look like missing
data rather than missing permission.

### Fix when needed

Add a SELECT policy on `public.marketing_assets` allowing a member of the owning
tenant to read assets whose parent campaign belongs to that tenant, regardless of
`is_published`:

```sql
create policy "Tenant members can view own tenant campaign assets"
on public.marketing_assets
for select
to authenticated
using (
  exists (
    select 1
    from public.marketing_campaigns c
    where c.id = marketing_assets.campaign_id
      and c.tenant_id is not null
      and public.is_tenant_member(auth.uid(), c.tenant_id)
  )
);
```

Verify with the synthetic-user probe pattern (different-tenant member sees 0 rows,
no-membership user sees 0 rows, owning-tenant member sees the drafts).

### Related

- The tenant Campaigns tab dropped its client-side `is_published` filter on
  2026-08-05 (`TenantMarketing.tsx`, `TenantMarketingDetail.tsx`). Campaign rows are
  now visible pre-publication; their `marketing_assets` are not.
- `TenantCodes.tsx` deliberately stays published-only — a promo code must not attach
  to an unapproved campaign.
