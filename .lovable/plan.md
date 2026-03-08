

## Phase 2: Enrich Campaign Cards with Asset Counts and Thumbnails

### Goal
Give marketing users at-a-glance visibility into campaign content without clicking into each one. Cards currently show only title, category, and description.

### Changes

#### 1. `src/pages/tenant/TenantMarketing.tsx`
- Add a new query that fetches asset summary data for all campaigns in a single request: select `campaign_id`, `count(*)`, and the first asset's `url` from `marketing_assets`, grouped by `campaign_id`.
- On each campaign card, below the category badge:
  - Show a small thumbnail of the first asset image (if available), rendered as a rounded preview strip at the top of the card or inline.
  - Show an asset count indicator (e.g., "3 assets" with an `ImageIcon`).
- If a campaign has zero assets, show a subtle "No assets yet" label instead.

#### 2. Data fetching approach
Rather than calling `useMarketingAssets` per campaign (N+1 problem), run a single query:
```sql
SELECT campaign_id, COUNT(*)::int as count, 
       MIN(url) as first_url
FROM marketing_assets 
GROUP BY campaign_id
```
This returns a map of `campaign_id → { count, first_url }` used during card rendering. Implemented as a standalone `useQuery` inside the component.

#### 3. Card layout update
- Add a thumbnail strip at the top of the card (48px tall, `object-cover`, rounded top corners) when a first asset URL exists.
- Add an asset count row in `CardContent` with `ImageIcon` + count text, styled as muted small text.

### No database or backend changes required — reads existing `marketing_assets` table.

