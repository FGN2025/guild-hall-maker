

## Add Tenant Role Assignment to Admin Users Page

### Problem
The "Set Role" dropdown on the Admin Users page only manages **platform roles** (User, Moderator, Marketing, Admin). Super Admins cannot assign **tenant roles** (Tenant Admin, Manager, Marketing) from this view — they must go through the tenant invitation workflow instead.

### Solution
Add a second "Set Tenant Role" control per user row that lets Super Admins assign or change a user's tenant role directly. This requires:
1. Selecting which tenant (if the user isn't already associated with one)
2. Selecting the tenant role (Admin, Manager, Marketing, or None)

### Implementation

**`src/hooks/useAdminUsers.ts`** — Add a `setTenantRole` mutation:
- Accepts `{ userId, tenantId, role }` (role can be null to remove)
- If role is null: delete from `tenant_admins` where user_id + tenant_id match
- If role is set: upsert into `tenant_admins` (insert on conflict update role)
- Also ensure the user has a `user_service_interests` record for that tenant (so they show up in tenant player lists)
- Invalidate `admin-users` query on success

**`src/hooks/useAdminUsers.ts`** — Fix tenant data mapping:
- Currently `tenantAdminMap` only stores one entry per user (Map key = user_id). This is fine for display but the tenant_id from tenant_admins should also be surfaced. Already done via `tenant_id` field from interests — but a user might have a tenant_admin role without an interest record. Update mapping to also check tenant_admins for tenant association.

**`src/pages/admin/AdminUsers.tsx`** — Add tenant role column controls:
- Replace the static "Tenant Role" badge column with an interactive control for Super Admins
- Add a compound selector: if user has no tenant, show a tenant picker dropdown first, then the role dropdown
- If user already has a tenant association, show just the tenant role dropdown (Admin / Manager / Marketing / Remove)
- Use the tenants list already fetched via `useTenantsList`

### UI Layout Change

The "Set Role" area expands to include a "Set Tenant Role" dropdown next to the existing platform role dropdown. The tenant role dropdown options:
- **None** — removes tenant_admins record
- **Tenant Admin**
- **Manager**  
- **Marketing**

When a user has no tenant association and the admin selects a tenant role, a small tenant picker appears inline to choose which tenant to assign them to.

### Files Changed

| File | Change |
|---|---|
| `src/hooks/useAdminUsers.ts` | Add `setTenantRole` mutation (upsert/delete on `tenant_admins`) |
| `src/pages/admin/AdminUsers.tsx` | Add interactive tenant role dropdown in the Tenant Role column; add tenant picker for unassociated users |

### Database
No migration needed — `tenant_admins` table already exists with the right schema. Platform admins already have full access via existing RLS policies (admin role check).

