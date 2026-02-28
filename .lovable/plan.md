

## Bypass Discord Linking for Admins

### Problem
Currently, all authenticated users -- including Super Admins and Admins -- are redirected to `/link-discord` if they haven't linked a Discord account. Admins need unrestricted platform access regardless of Discord status.

### Solution
Update `ProtectedRoute.tsx` to skip the Discord gate when the user has an admin role.

### Changes

**File: `src/components/ProtectedRoute.tsx`**
- Import `isAdmin` from the `useAuth` context (already available)
- Modify the Discord gate condition to also bypass when `isAdmin` is true:
  - Current: `if (!discordLinked && !DISCORD_EXEMPT_PATHS.includes(...))`
  - Updated: `if (!discordLinked && !isAdmin && !DISCORD_EXEMPT_PATHS.includes(...))`

This is a single-line change. The `isAdmin` flag is already computed in `AuthContext` from the `user_roles` table and loaded alongside `discordLinked`, so no timing or loading issues arise.

No other files need changes.

