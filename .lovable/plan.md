

# Tenant-Scoped Promo / Campaign Codes

## Current State

The existing `bypass_codes` table is **platform-wide** — it has no `tenant_id` column and is used solely for skipping ZIP verification during registration. It is managed only by platform Admins at `/admin/bypass-codes`. There is no concept of tenant-owned codes, and marketing campaigns (`marketing_campaigns` table) have no code association.

## What Needs to Change

### 1. New Database Table: `tenant_codes`

A new table scoped to tenants, separate from `bypass_codes` (which remains for platform-level ZIP bypass):

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK → tenants | Required |
| code | text | The code string |
| description | text | Purpose / notes |
| code_type | text | `campaign`, `override`, `access`, `tracking` |
| max_uses | int | Nullable = unlimited |
| times_used | int | Default 0 |
| expires_at | timestamptz | Nullable = never |
| is_active | boolean | Default true |
| campaign_id | uuid | Optional link to marketing_campaigns |
| created_by | uuid | Who created it |
| created_at | timestamptz | |

Unique constraint on `(tenant_id, code)`.

**RLS policies:**
- Platform Admins: full access (all tenants)
- Tenant Admins: full CRUD on own tenant's codes
- Tenant Marketing role: SELECT on own tenant's codes (read-only visibility for campaign setup)

### 2. New Hook: `src/hooks/useTenantCodes.ts`

- `useTenantCodes(tenantId)` — fetches codes for a specific tenant
- Mutations: create, update (toggle active), delete
- Used by both the Tenant panel and Admin panel

### 3. New Tenant Page: `src/pages/tenant/TenantCodes.tsx`

A codes management page in the Tenant portal at `/tenant/codes`:
- Table listing all codes for the tenant with code, type, description, usage count, expiry, active toggle, delete
- "Create Code" dialog with fields: code, description, type dropdown, max uses, expiry, optional campaign link
- Filtered by code_type tabs

### 4. Tenant Sidebar Update: `src/components/tenant/TenantSidebar.tsx`

Add a "Codes" nav item (visible to `admin` and `marketing` roles — admins can CRUD, marketing can view).

### 5. App Router Update: `src/App.tsx`

Add route `/tenant/codes` → `TenantCodes` inside the tenant layout.

### 6. Admin Visibility (Optional Enhancement)

Add a "Codes" count badge or link on each tenant card in `AdminTenants.tsx`, similar to the ZIP count badge, so platform admins can see at a glance which tenants have active codes. Platform admins can also manage codes via the tenant panel since they have full access.

## Summary of Files

| File | Action |
|---|---|
| Migration (new table + RLS) | Create `tenant_codes` table |
| `src/hooks/useTenantCodes.ts` | New hook |
| `src/pages/tenant/TenantCodes.tsx` | New page |
| `src/components/tenant/TenantSidebar.tsx` | Add nav item |
| `src/App.tsx` | Add route |
| `src/pages/admin/AdminTenants.tsx` | Add codes count badge to tenant cards |

No changes to the existing `bypass_codes` system — it continues to serve platform-level ZIP bypass independently.

