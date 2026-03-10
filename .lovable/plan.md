

## Add Tenant Role Column to Admin Users Table

### Changes

| File | Change |
|------|--------|
| `src/hooks/useAdminUsers.ts` | Add `tenant_role` field to `AdminUser` interface. Fetch `tenant_admins` table alongside existing queries, build a map of `user_id → role`, and merge into each user record. |
| `src/pages/admin/AdminUsers.tsx` | Add a "Tenant Role" column between Tenant and Role. Display a styled badge for tenant roles (Admin, Manager, Marketing) or "—" if not a tenant member. Update both header rows (loading + data) and skeleton column count. |

### Detail

**Hook** — fetch `tenant_admins` with `select("user_id, role, tenant_id")`, build a map keyed by `user_id`. Merge `tenant_role: tenantAdminMap.get(p.user_id)?.role ?? null` into each user. Also filter by `tenant_id` if the tenant filter is active.

**UI** — new column with badges:
- `admin` → blue/primary badge "Tenant Admin"
- `manager` → muted badge "Manager"  
- `marketing` → chart-4 colored badge "Marketing"
- `null` → dash

