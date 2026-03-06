

# Add Marketing Role to Tenant Admin Panel

## Problem
The TenantAdminPanel's role selector (line 487-494 in `AdminTenants.tsx`) only includes "Admin" and "Manager" options. The "Marketing" tenant role is missing, so platform admins cannot assign it from this page.

## Fix
Add a third `<option value="marketing">Marketing</option>` to the `<select>` dropdown in the `TenantAdminPanel` component.

## File Change
- **`src/pages/admin/AdminTenants.tsx`** (line ~493): Add `<option value="marketing">Marketing</option>` after the Manager option.

One-line change. No other files affected.

