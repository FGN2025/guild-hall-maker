# HCTC Brand Guide saves silently reverting — root cause & fix

## What's happening

Kerry's saves report success but never persist. Two independent defects, plus one likely third for the logo:

### 1. RLS blocks tenant admins from updating their own tenant row (root cause of colors + contact email)

`public.tenants` has only two policies:

- `SELECT` — anyone can view active tenants
- `ALL` — **only platform admins** (`has_role(auth.uid(), 'admin')`) can write

Kerry is a tenant admin (HCTC), not a platform admin. His `UPDATE public.tenants SET primary_color=..., accent_color=...` and the contact-email update both match zero rows under RLS. PostgREST returns `204 No Content` (not an error), the client's `if (error) throw` never fires, and the toast reports success. Nothing was written — that's why the values revert on reload.

Same class of silent-success bug we fixed on `AgentDraftsPanel` (`.select()` + zero-row guard). `TenantBranding.tsx` has none of that.

### 2. Client mutations lack the zero-row guard we standardized

`handleSaveColors`, `handleSaveEmail`, and `handleLogoUpload` all call `.update(...)` without `.select()`, so an RLS-filtered write silently succeeds in the UI regardless of policy state. Even after fix #1, we want this guard so the next RLS regression surfaces immediately.

### 3. Logo upload — likely the same RLS on `tenants` (message not shared)

The logo flow uploads the file to storage successfully (bucket policy allows any authenticated user's own folder — the storage write itself will work), then does `UPDATE public.tenants SET logo_url=...` which hits the same RLS wall. Kerry says he "received a message" but didn't paste it. Fix #1 resolves this too; we'll confirm with him after.

## Fix

### A. Migration: allow tenant admins/managers to update their tenant's brand fields

Add a scoped UPDATE policy on `public.tenants` using the existing `is_tenant_admin_or_manager(_tenant_id, _user_id)` helper:

```sql
CREATE POLICY "Tenant admins update own tenant brand"
ON public.tenants
FOR UPDATE
TO authenticated
USING (public.is_tenant_admin_or_manager(id, auth.uid()))
WITH CHECK (public.is_tenant_admin_or_manager(id, auth.uid()));
```

Platform admins keep full access via the existing `ALL` policy. We won't restrict column set at the DB layer (that requires a trigger); the UI only sends `logo_url`, `primary_color`, `accent_color`, `contact_email`. If we later need to prevent tenant admins from editing e.g. `plan_tier` or `status`, we add a `BEFORE UPDATE` trigger that raises when non-admins touch protected columns. Out of scope for this fix unless you want it now.

### B. Patch `src/pages/tenant/TenantBranding.tsx`

- `handleSaveColors`, `handleSaveEmail`, `handleLogoUpload`: append `.select("id")`, treat zero rows returned as a hard error with a red toast ("Save failed — you may not have permission").
- Initialize `contactEmail` state from `tenantInfo.contactEmail` in the existing `useEffect` so the field shows the current value instead of blank.
- Invalidate `["user-tenant-branding"]` after color/logo saves so the live CSS vars in `TenantBrandingProvider` refresh without a reload.

### C. Verify

1. Impersonate an HCTC tenant admin (or run as HCTC's real admin id via a server probe), UPDATE tenants with the new policy — expect 1 row.
2. In the preview, change primary color → save → reload the page → color persists.
3. Same for contact email.
4. Ask Kerry to retry the logo upload and paste the exact error if it still fails; likely resolved by A but we confirm.

## Technical notes

- The existing `useUserTenantBranding` query (`["user-tenant-branding", user.id]`) is what powers the live CSS vars; we'll invalidate it alongside `["tenants"]` and `["tenant-admin-check"]`.
- `useTenantAdmin` returns `tenantInfo.contactEmail` if present — verify field name when wiring the initial state; if it's not exposed there, read it once via a small `tenants` select on mount.
- No changes needed to Platform Admin behavior; the new policy is additive.

## Out of scope

- Column-level write restrictions on `tenants` for tenant admins (would need a trigger).
- Broader audit of other tenant-facing pages that write to `tenants` — none identified in a quick scan, but happy to extend if you want.
