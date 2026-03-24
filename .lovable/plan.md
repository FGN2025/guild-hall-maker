

## Tenant Admin Experience Assessment & RLS Bug Fix

### Findings

**1. Active Bug: 403 on `user_service_interests` INSERT (visible in network requests)**

When a Platform Admin assigns a tenant role via the Admin Users page, the `setTenantRole` mutation tries to insert a `user_service_interests` record for the target user. This fails because the only INSERT policy is:

```sql
"Users can insert own interests" — WITH CHECK (auth.uid() = user_id)
```

There is no admin-level INSERT policy, so platform admins cannot create interest records on behalf of other users. The tenant role itself gets assigned (to `tenant_admins`), but the supporting interest record fails silently.

**2. Missing DELETE policy on `user_service_interests`**

The `deleteLead` mutation in `useTenantPlayers` will also fail — there is no DELETE policy on this table at all.

**3. Tenant Isolation — Confirmed Correct**

Code review confirms proper isolation:
- All tenant data queries are scoped by `tenantId` from `useTenantAdmin()` hook
- RLS policies use `is_tenant_member(tenant_id, auth.uid())` for SELECT/UPDATE
- The `TenantRoute` component prevents unauthorized access
- Non-platform-admins cannot see the tenant picker dropdown
- Tenant Team page scopes all operations to `tenantInfo.tenantId`

### Fix Plan

**Database migration** — Add missing RLS policies on `user_service_interests`:

1. **Admin INSERT policy**: Allow platform admins to insert records for any user
2. **Tenant admin DELETE policy**: Allow tenant admins to delete leads for their tenant
3. **Admin DELETE policy**: Allow platform admins to delete any interest record

```sql
-- Allow admins to insert interests on behalf of users
CREATE POLICY "Admins can insert interests"
  ON public.user_service_interests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow tenant admins to delete leads for their tenant
CREATE POLICY "Tenant admins can delete their leads"
  ON public.user_service_interests FOR DELETE TO authenticated
  USING (is_tenant_member(tenant_id, auth.uid()));

-- Allow admins to delete any interest
CREATE POLICY "Admins can delete interests"
  ON public.user_service_interests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

**Frontend fix** — Make the `setTenantRole` mutation gracefully handle the interest insert failure (it's supplementary, not critical):

In `src/hooks/useAdminUsers.ts` line 216, wrap the interest insert in a try-catch so the tenant role assignment still succeeds even if the interest record fails.

### Files Changed

| File | Change |
|---|---|
| New migration SQL | 3 RLS policies on `user_service_interests` |
| `src/hooks/useAdminUsers.ts` | Wrap interest insert in try-catch (lines 213-217) |

### Summary

- Tenant data isolation is properly enforced via both code and RLS
- The RLS gap only affects admin operations (INSERT/DELETE on `user_service_interests`), not cross-tenant visibility
- Fix is a single migration + minor error handling improvement

