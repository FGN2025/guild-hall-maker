

# Consolidate Legacy Users into Admin Users View

## Root Cause of "Only 100 Records"

The database actually has **4,740 legacy users** -- all records are there. The browse UI in `AdminLegacyUsers.tsx` applies `filtered.slice(0, 100)` which caps the visible list to 100 rows. This is a display limit, not a data problem.

## Data Operation: Create FGN Tenant + Map Orphan Providers

The `legacy_users` table has three categories of "no tenant" records that should all belong to a new **FGN** tenant:

| Provider Name | Count |
|---|---|
| `No Provider` | 1,088 |
| `NULL` | 28 |
| `Fiber Gaming Network` | 10 |
| **Total** | **1,126** |

Steps:
1. Insert a new tenant: `name: "Fiber Gaming Network"`, `slug: "fgn"`, `is_active: true`
2. Update all `legacy_users` where `provider_name IN ('No Provider', 'Fiber Gaming Network')` or `provider_name IS NULL` to set `tenant_id` to the new FGN tenant ID

## UI Changes

### `AdminUsers.tsx` -- Add Legacy Users Tab + Tenant Filter

- Add `Tabs` component with two tabs: **Registered Users** (existing table) and **Legacy Users**
- Add a tenant filter dropdown at the top (populated from `tenants` table), shared across both tabs
- Legacy tab shows: Username, Email, Provider, Status, Matched, Created -- with server-side pagination (no more 100-row cap)
- Stats cards (Total, Matched, Unmatched, Verified) shown on the Legacy tab

### `useAdminUsers.ts` -- Add Tenant Context

- Add optional `tenantId` parameter to filter registered users
- Join `profiles` with `user_service_interests` to resolve each user's tenant association
- Add a `useTenantsList` query to populate the filter dropdown

### `useLegacyUsers.ts` -- Add Tenant + Search Filters

- Accept optional `tenantId` and `search` parameters
- Apply server-side filtering via `.eq("tenant_id", tenantId)` and `.or(...)` for search
- Remove the `slice(0, 100)` display cap (use proper pagination or raise the limit)

### `AdminLegacyUsers.tsx` -- Simplify to Import-Only

- Remove the "Browse" tab entirely since browsing moves to Admin Users
- Keep only the CSV Import functionality
- Update page title to "Legacy Import"

### `AdminSidebar.tsx` -- Rename Entry

- Change "Legacy Users" label to "Legacy Import"

## File Summary

| File | Change |
|---|---|
| Data operation | Create FGN tenant, update ~1,126 legacy_users rows |
| `src/pages/admin/AdminUsers.tsx` | Add Tabs, tenant dropdown, legacy users table |
| `src/hooks/useAdminUsers.ts` | Add `tenantId` filter, tenant list query |
| `src/hooks/useLegacyUsers.ts` | Add `tenantId` + `search` filter params, remove 100-row cap |
| `src/pages/admin/AdminLegacyUsers.tsx` | Remove browse, keep import only |
| `src/components/admin/AdminSidebar.tsx` | Rename label |

## Level of Effort: Low

No schema migrations needed. One data insert + update, then UI restructuring across 5 files.

