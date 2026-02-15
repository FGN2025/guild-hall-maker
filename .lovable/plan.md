
# Rename "Provider" to "Tenant" Across the Application

## Summary
Rename all references from "Provider" to "Tenant" for consistency with the manage.fgn.gg and hub.fgn.gg ecosystem. This includes user-facing labels, URL routes, file names, component names, and hook names.

## Changes Overview

### Files to Create (new names replacing old)

| Old File | New File |
|----------|----------|
| `src/pages/provider/ProviderDashboard.tsx` | `src/pages/tenant/TenantDashboard.tsx` |
| `src/pages/provider/ProviderLeads.tsx` | `src/pages/tenant/TenantLeads.tsx` |
| `src/pages/provider/ProviderZipCodes.tsx` | `src/pages/tenant/TenantZipCodes.tsx` |
| `src/pages/provider/ProviderSubscribers.tsx` | `src/pages/tenant/TenantSubscribers.tsx` |
| `src/components/provider/ProviderLayout.tsx` | `src/components/tenant/TenantLayout.tsx` |
| `src/components/provider/ProviderRoute.tsx` | `src/components/tenant/TenantRoute.tsx` |
| `src/components/provider/ProviderSidebar.tsx` | `src/components/tenant/TenantSidebar.tsx` |
| `src/components/provider/IntegrationConfigCard.tsx` | `src/components/tenant/IntegrationConfigCard.tsx` |
| `src/components/provider/SubscriberUploader.tsx` | `src/components/tenant/SubscriberUploader.tsx` |
| `src/hooks/useProviderLeads.ts` | `src/hooks/useTenantLeads.ts` |
| `src/hooks/useProviderSubscribers.ts` | `src/hooks/useTenantSubscribers.ts` |
| `src/hooks/useProviderIntegrations.ts` | `src/hooks/useTenantIntegrations.ts` |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Update imports to new paths, change routes from `/provider/*` to `/tenant/*`, rename components |
| `src/components/Navbar.tsx` | Change link from `/provider` to `/tenant`, label from "Provider" to "Tenant" |
| `src/components/AppSidebar.tsx` | Change label from "Provider" to "Tenant", link to `/tenant`, tooltip to "Tenant Panel" |

### Route Changes

| Old Route | New Route |
|-----------|-----------|
| `/provider` | `/tenant` |
| `/provider/leads` | `/tenant/leads` |
| `/provider/zip-codes` | `/tenant/zip-codes` |
| `/provider/subscribers` | `/tenant/subscribers` |

### Label Changes

| Location | Old Text | New Text |
|----------|----------|----------|
| Sidebar header | "Provider Admin" | "Tenant Admin" |
| Navbar link | "Provider" | "Tenant" |
| AppSidebar group | "Provider" | "Tenant" |
| AppSidebar tooltip | "Provider Panel" | "Tenant Panel" |

### Internal Renames

- All component names: `ProviderDashboard` becomes `TenantDashboard`, etc.
- All hook names: `useProviderLeads` becomes `useTenantLeads`, etc.
- Query keys: `provider-leads` becomes `tenant-leads`, `provider-zips` becomes `tenant-zips`, `provider-zip-count` becomes `tenant-zip-count`
- Import paths updated throughout

### What Does NOT Change

- Database table names (`tenant_admins`, `tenant_zip_codes`, `tenant_subscribers`, `tenant_integrations`) -- these already use "tenant"
- The `useTenantAdmin` hook -- already named correctly
- The `provider_type` column in `tenant_integrations` -- this refers to external system providers (NISC, GLDS), not the broadband provider concept
- The `useRegistrationZipCheck.ts` hook's internal `Provider` interface -- refers to broadband service providers found during ZIP lookup, which is a different concept
- React context providers (AuthProvider, TooltipProvider, etc.) -- these are React patterns, not related
- The `ExternalLink` ecosystem links to manage.fgn.gg and hub.fgn.gg

### Implementation Approach

1. Create all new files under `src/pages/tenant/` and `src/components/tenant/` and `src/hooks/` with updated names
2. Update `App.tsx`, `Navbar.tsx`, and `AppSidebar.tsx` to use new imports and routes
3. Delete old files under `src/pages/provider/` and `src/components/provider/` and old hook files

No database migrations needed -- the database already uses "tenant" terminology.
