

# Add Event Promo Templates to Tenant Portal

## Problem
The Event Promo Editor is admin-only. Tenant marketers cannot generate promotional assets from their own tenant events. They need the ability to pick a tenant event, auto-populate the canvas with its details (image, name, date, prize), edit it, and save it to their tenant assets.

## Plan

### 1. Create `TenantPromoPickerDialog` component
New file: `src/components/marketing/TenantPromoPickerDialog.tsx`

- A dialog that queries `tenant_events` scoped to the current tenant (accepts `tenantId` prop)
- Displays event cards with name, game, date, status
- Search filter
- On selection, builds promo data using `buildTenantEventPromo()` (same pattern as `buildTournamentPromo`) and opens the `AssetEditorDialog` with the event's `image_url` as background and text overlays for name, game, date, prize_pool
- On save, uploads blob to `app-media` storage and inserts into `tenant_marketing_assets` table (not `media_library`) using the existing `uploadAsset` mutation from `useTenantMarketingAssets`

### 2. Add "From Event" button to `TenantMarketingAssets.tsx`
- Import `TenantPromoPickerDialog`
- Add a "From Event" button next to "Upload Asset" in the header
- Wire it to the new dialog, passing the tenant's ID
- On save, use the existing `uploadAsset` mutation so the result appears in "My Assets"

### 3. Add "Promo" button to `TenantEvents.tsx` event cards
- Add a small `Megaphone` icon button on each event card
- On click, build promo data from that event and open `AssetEditorDialog` directly
- On save, upload to tenant marketing assets

### 4. Get tenant ID
- `TenantMarketingAssets` doesn't currently have tenant context. Use `useTenantAdmin()` hook (already used in `TenantEvents.tsx`) to get `tenantInfo.tenantId`

## Files to Modify

| File | Change |
|---|---|
| `src/components/marketing/TenantPromoPickerDialog.tsx` | New — tenant event picker + promo builder |
| `src/pages/tenant/TenantMarketingAssets.tsx` | Add "From Event" button and dialog |
| `src/pages/tenant/TenantEvents.tsx` | Add "Promo" button per event card |

No database or backend changes needed — tenant events and tenant marketing assets tables already exist.

