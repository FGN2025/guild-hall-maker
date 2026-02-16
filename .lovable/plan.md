

# Tenant Team Management Feature

## Overview
Add a `role` column to `tenant_admins`, create a `/tenant/team` page for tenant admins to manage their team (invite managers), and enforce permission differences between admin and manager roles.

## Permission Model

| Capability | Admin | Manager |
|---|---|---|
| View Dashboard | Yes | Yes |
| View Leads | Yes | Yes |
| Manage ZIP Codes | Yes | No |
| Manage Subscribers | Yes | No |
| Manage Team (invite/remove) | Yes | No |
| Ecosystem Links | Yes | Yes |

Managers get read-only access to leads and the dashboard. Admins get full access to everything plus the ability to manage team members.

## Changes

### 1. Database Migration
- Add a `role` column to `tenant_admins` with values `'admin'` or `'manager'`, defaulting to `'admin'` (so existing rows are unaffected).
- Add an RLS policy so tenant admins can manage team members within their own tenant (currently only super admins can insert/delete from `tenant_admins`).
- Add an RLS policy so managers can view their own `tenant_admins` row (already exists).

### 2. Update `useTenantAdmin` hook
- Include the `role` field in the query and return it as part of `tenantInfo` (e.g., `tenantRole: 'admin' | 'manager'`).

### 3. Update `TenantRoute` component
- Pass `tenantRole` through to `TenantLayout` so it can be used for conditional rendering.

### 4. Update `TenantSidebar`
- Add a "Team" nav item (only visible to admin role).
- Hide "ZIP Codes" and "Subscribers" links for managers.

### 5. Create `/tenant/team` page (`src/pages/tenant/TenantTeam.tsx`)
- Shows list of current team members with their role (admin/manager) and display name.
- Admins can search by display name and add new managers.
- Admins can remove team members (but not themselves).
- Admins can change a member's role between admin and manager.

### 6. Update `useTenants.ts` hook
- Update `useTenantAdmins` to include the `role` field.
- Update `addAdmin` mutation to accept a `role` parameter.
- Add an `updateRole` mutation.

### 7. Update `AdminTenants.tsx`
- Show role badge (admin/manager) next to each tenant admin in the super admin panel.
- Allow super admins to set role when adding.

### 8. Register the new route in `App.tsx`
- Add `/tenant/team` route wrapped in `TenantRoute`.

### 9. Guard restricted pages
- In `TenantZipCodes` and `TenantSubscribers`, redirect managers back to `/tenant` if their role is `manager`.

## Technical Details

### Migration SQL
```text
ALTER TABLE tenant_admins
  ADD COLUMN role text NOT NULL DEFAULT 'admin';

-- Tenant admins (role=admin) can manage team members for their tenant
CREATE POLICY "Tenant admins can manage their team"
  ON tenant_admins FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_admins ta
      WHERE ta.tenant_id = tenant_admins.tenant_id
        AND ta.user_id = auth.uid()
        AND ta.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_admins ta
      WHERE ta.tenant_id = tenant_admins.tenant_id
        AND ta.user_id = auth.uid()
        AND ta.role = 'admin'
    )
  );
```

### Files to create
- `src/pages/tenant/TenantTeam.tsx` -- team management page

### Files to modify
- `src/hooks/useTenantAdmin.ts` -- add role to query/return
- `src/hooks/useTenants.ts` -- add role to TenantAdmin interface, addAdmin, updateRole
- `src/components/tenant/TenantRoute.tsx` -- pass role to layout
- `src/components/tenant/TenantLayout.tsx` -- accept and pass role
- `src/components/tenant/TenantSidebar.tsx` -- conditional nav items based on role
- `src/pages/admin/AdminTenants.tsx` -- show role badges, role selector on add
- `src/pages/tenant/TenantZipCodes.tsx` -- guard for manager role
- `src/pages/tenant/TenantSubscribers.tsx` -- guard for manager role
- `src/App.tsx` -- add /tenant/team route

