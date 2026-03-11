

## Bypass ZIP and Discord Gates for Invited Staff

Invited tenant staff (admin, moderator, marketing) should skip both the ZIP code verification and Discord linking requirements. These gates are only relevant for player registrations.

### Current State
- **ZIP gate**: Already bypassed for invite flow (`isInviteFlow ? "account" : "zip"` on Auth.tsx line 51) -- no change needed.
- **Discord gate**: Only bypasses for platform `isAdmin`. Moderators, marketing users, and tenant staff (who only exist in `tenant_admins` table, not `user_roles`) are still forced to `/link-discord`.

### Changes

**1. AuthContext.tsx — Add `isTenantStaff` flag**
- After fetching roles and profile, also check if the user has any row in `tenant_admins`.
- Add a `isTenantStaff` boolean to the context.
- In `fetchRoleAndDiscord`, add a third parallel query: `supabase.from("tenant_admins").select("id").eq("user_id", userId).limit(1)`.
- Set `isTenantStaff = true` if any row exists.

**2. ConditionalLayout.tsx — Exempt all staff from Discord gate**
- Pull `isModerator`, `isMarketing`, and `isTenantStaff` from `useAuth()`.
- Change Discord gate condition from `!discordLinked && !isAdmin` to:
  `!discordLinked && !isAdmin && !isModerator && !isMarketing && !isTenantStaff`

**3. ProtectedRoute.tsx — Same exemption**
- Pull `isModerator`, `isMarketing`, `isTenantStaff` from `useAuth()`.
- Update the Discord gate check to also exempt these roles (in addition to existing path-based exemptions).

### Files
- `src/contexts/AuthContext.tsx` — add tenant_admins query + `isTenantStaff`
- `src/components/ConditionalLayout.tsx` — widen Discord exemption
- `src/components/ProtectedRoute.tsx` — widen Discord exemption

