
## Context

Kerry Sutton (`ksutton@hctc.coop`, HCTC tenant admin) reports: "I can access the play screen but my admin dashboard says link not found."

Confirmed from the database:
- Auth user exists, email confirmed 2026-07-21, logged in successfully.
- `tenant_admins` row: `admin` role on **HCTC** (active). He IS a tenant admin.
- `user_roles`: no rows — he is NOT a platform admin.
- Invitation already claimed 2026-07-21.

His tenant admin surface lives at `/tenant`. "Link not found" is the app's `NotFound.tsx` ("Oops! Page not found"), which fires when a route doesn't match.

Two things are almost certainly happening together:

1. **Nav label mismatch.** The tenant-admin navbar link is labeled just **"Tenant"** (Building2 icon). Kerry is looking for something called "Admin Dashboard", doesn't see one, and guesses URLs like `/admin`, `/admin/dashboard`, `/dashboard/admin`. `/admin/dashboard` isn't a route → NotFound. `/admin` bounces non-platform-admins to `/dashboard` with a scary "Access denied" toast.
2. **No safety net for common wrong URLs.** Tenant admins get either NotFound or the destructive toast — with no signpost to their real area at `/tenant`.

## Fix plan (frontend-only, no schema/RLS changes)

### 1. Rename the tenant-admin nav entry
- `src/components/Navbar.tsx` (desktop + mobile) and `src/components/AppSidebar.tsx`:
  - Change label from **"Tenant"** to **"Tenant Admin"** for `isTenantAdmin` users. Keep `Building2` icon, still `to="/tenant"`.
- Platform-admin "Admin" link unchanged.

### 2. Route aliases so common wrong URLs land in the right place
In `src/App.tsx`, add a small role-aware redirect component:

```text
/admin/dashboard  → /admin  if isAdmin
                  → /tenant if isTenantAdmin
                  → /dashboard otherwise

/tenant/dashboard → /tenant
```

Implement inline using `useAuth()` + `useTenantAdmin()` + `<Navigate>`, wrapped in `<ProtectedRoute>`.

### 3. Softer AdminRoute bounce for tenant admins
`src/components/admin/AdminRoute.tsx`:
- If signed-in user has `isTenantAdmin && !isAdmin` and hits `/admin/*`, redirect to `/tenant` and show a neutral info toast ("Opening your tenant admin dashboard") instead of the destructive "Access denied".
- Behavior for logged-out or true-non-admin users is unchanged.

### 4. Helpful NotFound page for logged-in users
`src/pages/NotFound.tsx`:
- If `isAdmin` → also show "Go to Admin Dashboard" (`/admin`).
- Else if `isTenantAdmin` → show "Go to Tenant Admin" (`/tenant`).
- Otherwise keep "Return to Home".
- Preserve the existing `console.error` for observability.

### 5. Verification
- Confirm navbar shows **"Tenant Admin"** for Kerry's role.
- `/admin/dashboard` → redirects to `/tenant` (no NotFound).
- `/admin` → redirects to `/tenant` with a neutral toast (no "Access denied").
- `/tenant` loads TenantDashboard for HCTC.
- Platform-admin behavior at `/admin` unchanged.

## Out of scope
- No schema, RLS, or `tenant_admins`/`user_roles` changes — Kerry's permissions are already correct.
- No changes to the invite email template or `send-tenant-invite`.
- No changes to onboarding, Discord linking, or subscription checks.

## Documentation updates
- Tenant Guide (`src/pages/tenant/TenantGuide.tsx`) — Added 'Finding Your Admin Dashboard' section explaining the 'Tenant Admin' nav label, soft redirect from `/admin`, and troubleshooting steps.
- Admin Guide (`src/pages/admin/AdminGuide.tsx`) — Added 'Tenant Admin Redirects & Link Not Found' section for platform staff troubleshooting tenant admin access issues.
- README (`README.md`) — Added 'Role-Aware Redirects' table under Route Map documenting `/admin`, `/admin/dashboard`, and `/tenant/dashboard` resolution rules.

## Follow-up message to Kerry after deploy
"You're set up correctly as the HCTC tenant admin. Your admin area is under **Tenant Admin** in the top nav (or at `/tenant`). I've relabeled the menu and added redirects so `/admin` and `/admin/dashboard` also take you there — no more 'page not found'."
