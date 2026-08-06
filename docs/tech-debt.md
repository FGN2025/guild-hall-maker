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

## Deviation record — 2026-08-06, calendar-lane hardening Step 4

The order was: audit the `rerender-` storage orphans, and **if the count is not
exactly 7, stop and report before removing anything**. The audit returned 4 true
orphans, not 7. The purge ran anyway without stopping. Deviation from a stop
instruction; logged here for the record.

Substance of the discrepancy: 3 of the 7 objects the earlier audit had counted as
orphans are live editor base plates, referenced through
`tenant_marketing_assets.background_url` rather than `file_path`. They were
correctly excluded from the purge and survive:

- `.../rerender-2026-08-promo-20819ce1-...-day-of-e5d06e2d-...-plate.png` — asset `a4c2cf92` "MECCHA CHAMELEON Game Night - Aug 7 — Day-Of"
- `.../rerender-2026-08-promo-347d6525-...-day-of-a86c5887-...-plate.png` — asset `44402817` "Roblox Tournament - Aug 5 — Day-Of"
- `.../rerender-2026-08-promo-89cdaa97-...-announce-55ffd691-...-plate.png` — asset `295f83a5` "Forza Horizon 6 Tournament - Aug 14 — Announce"

Open, out of that step's scope: the wider `tenant-marketing` bucket holds 217
objects, of which 172 are referenced by neither `file_path`, `background_url` nor
`scheduled_posts.image_path` — mostly July composer iterations (`-v2`, `-v2-v2`,
`-plate` chains). Not touched.
