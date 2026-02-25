

## Per-Tenant Logos and Branding Enhancement

### Overview
The database already stores `logo_url` per tenant, but there's no UI to upload or manage it, and it's not displayed in the tenant portal. This plan adds a complete per-tenant branding flow.

### Changes

#### 1. Add Tenant Branding Settings Page (`src/pages/tenant/TenantSettings.tsx`)
- New page accessible from tenant sidebar (admin-only)
- Logo upload with preview, using the existing `app-media` storage bucket
- Fields: Company Logo, Company Name (display-only), Contact Email (editable)
- Uses existing `useTenants` hook's `updateTenant` mutation to save `logo_url`

#### 2. Add Logo Upload to Admin Create/Edit Tenant Dialog (`src/pages/admin/AdminTenants.tsx`)
- Add a logo upload field to the "New Provider" dialog
- Add an inline edit button on each tenant card to update the logo
- Uploads go to `app-media` bucket under a `tenant-logos/` prefix

#### 3. Display Logo in Tenant Sidebar (`src/components/tenant/TenantSidebar.tsx`)
- Pass `logoUrl` through `TenantLayout` from `tenantInfo`
- Show tenant logo (or fallback icon) in the sidebar header area above the tenant name

#### 4. Display Logo in Tenant Layout Mobile Header (`src/components/tenant/TenantLayout.tsx`)
- Show small logo next to tenant name in the mobile top bar

#### 5. Update `useTenantAdmin` Hook (`src/hooks/useTenantAdmin.ts`)
- Include `logo_url` in the `TenantAdminInfo` interface and query result so it's available throughout the tenant portal

#### 6. Add Route and Sidebar Link
- Register `/tenant/settings` route in `src/App.tsx`
- Add "Settings" link to tenant sidebar (admin-only), using a Settings/Cog icon

### Technical Details

**Files to create:**
- `src/pages/tenant/TenantSettings.tsx` -- Branding settings page with logo upload

**Files to modify:**
- `src/hooks/useTenantAdmin.ts` -- Add `logoUrl` to returned tenant info
- `src/components/tenant/TenantSidebar.tsx` -- Accept and display logo; add Settings nav link
- `src/components/tenant/TenantLayout.tsx` -- Pass `logoUrl` to sidebar and mobile header
- `src/components/tenant/TenantRoute.tsx` -- Pass `logoUrl` through
- `src/pages/admin/AdminTenants.tsx` -- Add logo upload to create/edit flows
- `src/App.tsx` -- Register `/tenant/settings` route

**Storage:** Uses existing `app-media` public bucket. Logos uploaded under `tenant-logos/{tenantId}.{ext}`.

**No database migration needed** -- `logo_url` column already exists on the `tenants` table.

