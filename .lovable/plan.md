

# Add "Create New Provider" Option for Unmatched Rows in Bulk ZIP Import

## Recommendation

**Skip-then-add-manually is simpler and lower risk**, but adding an inline "Add as New Provider" button is a small change that fits naturally into the existing unmatched row UI. The effort is modest — roughly one new button and a small mutation. I recommend adding it.

## Current State

The `BulkZipImportDialog` already handles unmatched providers with two options: **Assign to existing tenant** (dropdown) or **Skip**. The `useTenants` hook already has a `createTenant` mutation. The tenant create flow in `AdminTenants.tsx` collects name, slug, contact email, and status.

## Changes

### `src/components/admin/BulkZipImportDialog.tsx`

Add a third action button **"Add as New"** next to the existing "Assign to..." dropdown and "Skip" button for each unmatched row. When clicked:

1. Open a small inline form (or mini-dialog) pre-filled with `providerName` as the name and a slugified version as the slug
2. Include an **Active/Inactive** toggle (defaulting to active)
3. On confirm, insert the new tenant via `supabase.from("tenants").insert(...)`, then update the row's `matchedTenantId` to the new tenant's ID and change its status to `"matched"`
4. The new tenant immediately appears in the assign dropdown for other unmatched rows too

### Props Update

The component currently receives `tenants: Tenant[]`. It will also need the `onComplete` callback (already present) to refresh the tenant list after a new provider is created. We'll add a local `refetchTenants` callback or accept a mutation/refetch function so the tenants list stays current after inline creation.

### Specific UI for each unmatched row

The action area becomes three options:
- **Assign to...** (existing dropdown)
- **Add as New** (creates tenant with pre-filled name, slug, and active/inactive toggle)
- **Skip**

No database changes needed — the `tenants` table already supports `status` for active/inactive.

