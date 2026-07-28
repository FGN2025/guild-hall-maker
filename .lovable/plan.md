## What I verified in HCTC's live data

- `tenants` row for HCTC now holds `primary_color #097abf`, `accent_color #6bc7c2`, `contact_email marketing@hctc.coop`, last updated today 12:58 UTC. **His colour/email saves ARE reaching the database.**
- The tenant-admin UPDATE policy on `tenants` exists and Kerry's membership role is `admin`, so writes pass RLS.
- The `app-media` upload policy requires the first folder of the file path to equal the uploader's user id (or platform admin/moderator). The Brand Guide uploads to `tenant-logos/<tenant-id>.png`, so a tenant admin's upload is rejected — exactly the "new row violates row-level security policy" message he screenshotted.

So there are two distinct remaining defects.

## Defect 1 — brand values look reverted (display-only, cache key mismatch)

`TenantBranding.tsx` invalidates the query key `["tenant-admin-check"]` after a save, but `useTenantAdmin` actually registers its queries under `["tenant-admin-memberships", userId]` and `["all-tenants-list"]`. Nothing invalidates those, so the sidebar-level hook keeps serving the pre-save cached tenant row. Navigating away and back re-renders from that stale cache and the form re-seeds the old colours — the data on the server is correct, the screen is not. A hard reload would show the new values.

Fix:
- Invalidate `["tenant-admin-memberships"]` and `["all-tenants-list"]` (alongside the existing `["user-tenant-branding"]`) after colour, email, and logo saves.
- Drop the dead `["tenant-admin-check"]` key.
- Re-read `contact_email` after a successful email save so the field reflects the stored value rather than local state alone.

## Defect 2 — logo upload blocked by storage policy

The upload path `tenant-logos/<tenant-id>.<ext>` can never satisfy the `app-media` insert policy for a non-platform-admin. Two options; I recommend A.

**A. Add a scoped storage policy (recommended).** New INSERT/UPDATE policies on `storage.objects` for bucket `app-media` allowing writes under `tenant-logos/<tenant-id>.*` when `is_tenant_admin_or_manager(<tenant-id>, auth.uid())`. Keeps the tidy, stable path and the existing public URL, so HCTC's current logo URL keeps working. Requires parsing the tenant id out of the filename in the policy expression.

**B. Move to a per-tenant folder** `tenant-logos/<tenant-id>/logo.<ext>` and match the folder segment in the policy. Cleaner expression, but changes the URL shape for every tenant.

Either way, also surface the raw storage error text in the red toast so a future policy block reads as an actionable message instead of the bare Postgres string.

## Verification

1. Sign in as an HCTC tenant admin in the preview, change the primary colour, save, navigate to another tenant page and back — new colour still shown without a reload.
2. Same for contact email.
3. Upload a new logo as that tenant admin — upload succeeds, preview and sidebar logo both update.
4. Confirm a platform admin can still update any tenant's branding, and that a `marketing`-role tenant member still cannot.

## Technical notes

- Files touched: `src/pages/tenant/TenantBranding.tsx` (invalidation keys, error surfacing), one migration for the storage policy.
- No change to `useTenantAdmin`'s query keys themselves — safer to fix the invalidation side than rename keys used across the sidebar and layout.
- The `tenants` UPDATE policy added previously is correct and stays as-is.

## Out of scope

- Column-level restrictions on what tenant admins may edit on `tenants`.
- Auditing other pages that write to `tenants` (none identified writing brand fields).
