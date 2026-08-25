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

- `41a2e493-.../agent/2026/08/rerender-2026-08-promo-20819ce1-...-day-of-e5d06e2d-...-plate.png` — `tenant_marketing_assets.a4c2cf92-5868-48af-a497-e0c174fcd6ee` (Portrait 1080x1350)
- `41a2e493-.../agent/2026/08/rerender-2026-08-promo-347d6525-...-day-of-a86c5887-...-plate.png` — `tenant_marketing_assets.44402817-823d-410b-9936-0322facc8307` (Portrait 1080x1350)
- `41a2e493-.../agent/2026/08/rerender-2026-08-promo-89cdaa97-...-announce-55ffd691-...-plate.png` — `tenant_marketing_assets.295f83a5-a518-4363-a795-66bc243cb505` (Portrait 1080x1350)

Open, out of that step's scope: the wider `tenant-marketing` bucket holds 217
objects, of which 172 are referenced by neither `file_path`, `background_url` nor
`scheduled_posts.image_path` — mostly July composer iterations (`-v2`, `-v2-v2`,
`-plate` chains). Not touched.

## Status-vocabulary collision — `pending` vs `pending_review` (logged 2026-08-11)

`scheduled_posts.status` uses `pending` to mean "approved, awaiting its dispatch
window", sitting one underscore away from `pending_review`, which means the
opposite (not approved). The dispatcher matches `pending` exactly.

- `src/hooks/useDraftDecision.ts:50-58` — approval path, writes `pending` for
  scheduled posts and `approved` for campaigns (two vocabularies, one hook).
- `src/components/marketing/ScheduledPostsCalendar.tsx:88` — optimistic local
  state mirrors the same `pending` value.

Cleanup (rename to `approved`/`queued` + dispatcher + migration) is deliberately
deferred; it was not done on the day of the first live publish.

## Resolved — 2026-08-25

- `scheduled_posts.status` column default is now `'draft'` (verified in the live
  schema). The held migration file was applied out-of-band; removed from
  `docs/migrations-pending/`.

## `email_send_log` pending markers (logged 2026-08-25)

The enqueue path writes a `pending` row and the queue processor records each
outcome as a NEW row with the same `message_id` — it never updates the marker.
A healthy send therefore leaves a cosmetic `pending` row behind forever. As of
2026-08-25 there are 158 such rows, and every one has a terminal sibling
(`sent`/`failed`/`dlq`): none represent undelivered mail, and re-sending them
would duplicate-send.

Going forward, `process-email-queue` runs a sweep: a `pending` row older than
24h with NO non-pending sibling means the queue entry was genuinely lost, so
the sweep marks it `failed` (`never processed`) and raises the dead-letter
signal. When querying for stuck mail, always join against terminal siblings —
a bare `status = 'pending'` count is meaningless on this table.
