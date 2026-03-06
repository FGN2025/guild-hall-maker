

# Enable Platform Admins to Access All Tenant Features

## Problem Assessment

Platform Admins (Super Admin / Admin role in `user_roles`) currently **cannot access** `/tenant/*` routes because:

1. **`useTenantAdmin` hook** only checks the `tenant_admins` table — platform admins aren't listed there
2. **`TenantRoute`** gates on `isTenantAdmin`, redirecting platform admins to `/dashboard`
3. **`AppSidebar`** only shows the "Tenant Panel" link when `isTenantAdmin` is true
4. There's no mechanism for a platform admin to **select which tenant** to manage (since they aren't bound to one)

## Solution

Give platform admins full access to all tenant features with a **tenant selector** so they can switch between tenants.

### 1. Update `useTenantAdmin` hook to support platform admins

- Accept `isAdmin` from `useAuth()`
- If the user is a platform admin, fetch **all active tenants** (not just those in `tenant_admins`)
- Store a `selectedTenantId` in `localStorage` so it persists across navigation
- Return `isTenantAdmin: true` and `tenantRole: 'admin'` for platform admins with a selected tenant
- Expose `allTenants` list and `setSelectedTenantId` for the tenant picker UI

### 2. Update `TenantRoute` to allow platform admins

- Check `isAdmin` from `useAuth()` in addition to `isTenantAdmin`
- If admin but no tenant selected yet, show a tenant picker instead of redirecting

### 3. Update `TenantLayout` / `TenantSidebar` with tenant switcher

- When user is a platform admin, render a **tenant selector dropdown** in the sidebar header
- Changing the selection updates the hook's `selectedTenantId` and reloads tenant-scoped data
- All sidebar items visible (admin role = full access)

### 4. Update `AppSidebar` to show Tenant Panel for admins

- Change condition from `isTenantAdmin` to `isTenantAdmin || isAdmin`

### 5. No RLS changes needed

Platform admins already have `ALL` policies on tenant-scoped tables via `has_role(auth.uid(), 'admin')`. The data layer is already correct — this is purely a UI/routing gate fix.

## Files to Change

| File | Change |
|---|---|
| `src/hooks/useTenantAdmin.ts` | Add platform admin logic, tenant list, selector state |
| `src/components/tenant/TenantRoute.tsx` | Allow platform admins through |
| `src/components/tenant/TenantSidebar.tsx` | Add tenant switcher dropdown for platform admins |
| `src/components/tenant/TenantLayout.tsx` | Pass `allTenants` + `onTenantChange` props |
| `src/components/AppSidebar.tsx` | Show Tenant Panel link for platform admins |

## Level of Effort: Low

No database or RLS changes. Five file edits focused on routing and UI gating.

