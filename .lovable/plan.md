

## Add Marketing Role at Both Platform and Tenant Levels

### Overview
Introduce a "Marketing" role at two levels so that Super Admins can assign platform-wide marketing access, and Tenant Admins can assign marketing access within their team. Users with this role will be able to access and manage source marketing assets in the media library.

---

### 1. Database: Add "marketing" to the `app_role` enum

Run a migration to extend the existing PostgreSQL enum:

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
```

This allows the `user_roles` table to store `marketing` as a valid platform-level role alongside `admin`, `moderator`, and `user`.

No changes needed to the `tenant_admins` table since it uses a plain `text` column for `role` -- it already supports arbitrary values like `marketing` without a schema change.

---

### 2. Database: Security-definer helper (optional but clean)

Add a convenience function for checking the marketing role, following the existing `has_role` pattern:

```sql
-- Reuse existing has_role() -- no new function needed.
-- has_role(uid, 'marketing') will work once the enum value exists.
```

---

### 3. Frontend: Super Admin user management (AdminUsers.tsx)

Add "Marketing" as a selectable role in the role dropdown on the Admin Users page:

- Add `<SelectItem value="marketing">Marketing</SelectItem>` to the role selector
- Add a marketing badge style in the `roleBadge` helper

**File**: `src/pages/admin/AdminUsers.tsx`

---

### 4. Frontend: useAdminUsers hook update

In `src/hooks/useAdminUsers.ts`, the `setRole` mutation inserts into `user_roles` -- no change needed since it already handles arbitrary role strings. The enum extension at the DB level is sufficient.

---

### 5. Frontend: Tenant Team page (TenantTeam.tsx)

Add "Marketing" as a third role option in the tenant team management:

- Add `<SelectItem value="marketing">Marketing</SelectItem>` to both the "add member" role selector and the per-member role dropdown
- Update the role descriptions text to explain the Marketing role

**File**: `src/pages/tenant/TenantTeam.tsx`

---

### 6. Frontend: AuthContext -- expose `isMarketing` flag

Update `src/contexts/AuthContext.tsx` to:
- Add `isMarketing` boolean state
- Set it when fetching the user's role (`data?.role === 'marketing'`)
- Expose it in the context value

This enables route guards and conditional UI for marketing users.

---

### 7. Frontend: useTenantAdmin hook update

Update `src/hooks/useTenantAdmin.ts` to also recognize `marketing` as a valid tenant role (alongside `admin` and `manager`), so tenant-level marketing users can access the tenant panel.

---

### 8. Frontend: useUserRole hook update

Update `src/hooks/useUserRole.ts` to add `"marketing"` to the `AppRole` type union:

```typescript
export type AppRole = "admin" | "moderator" | "marketing" | "user";
```

---

### Summary of files to change

| File | Change |
|------|--------|
| Migration (SQL) | Add `marketing` to `app_role` enum |
| `src/hooks/useUserRole.ts` | Add `marketing` to `AppRole` type |
| `src/contexts/AuthContext.tsx` | Add `isMarketing` flag |
| `src/pages/admin/AdminUsers.tsx` | Add Marketing option to role dropdown + badge |
| `src/pages/tenant/TenantTeam.tsx` | Add Marketing option to role dropdowns + description |
| `src/hooks/useTenantAdmin.ts` | Recognize `marketing` as valid tenant role |

This lays the groundwork for the next step: creating a marketing-specific area of the media library gated behind this role.

