

## Fix: Admin Users Briefly Redirected to Link Discord Page

### Root Cause
There is a race condition in the `AuthContext`. When the app reloads (e.g., after the code edit deployed), `onAuthStateChange` fires and sets `loading=false` but defers role fetching via `setTimeout`. During that brief window, if `getSession` resolves and `roleLoading` transitions from `true` → `false` with stale `isAdmin=false`, the `ProtectedRoute` Discord gate fires and redirects to `/link-discord`. The `LinkDiscord` component has a redirect-back useEffect for admins, but it only fires after roles load — causing a visible flash of the Discord linking page.

### Fix

**File: `src/contexts/AuthContext.tsx`**
- Remove the `setTimeout` wrapper around `fetchRoleAndDiscord` in the `onAuthStateChange` handler. Call it directly (like the `getSession` path already does). The `setTimeout` was added to avoid a Supabase deadlock that no longer applies, and it introduces the race condition.
- Add a guard so that if `fetchRoleAndDiscord` is already in-flight, a second call doesn't reset `isAdmin` to `false` via `setRoleLoading(true)` prematurely.

**File: `src/components/ProtectedRoute.tsx`**
- Add `/tenant` prefix paths to the Discord-exempt list so tenant admin routes don't trigger the Discord gate for platform admins.
- Alternatively (simpler): also check `roleLoading` in the Discord gate — if roles are still loading, show the spinner instead of redirecting. This is already done at the top, but the current code could hit the Discord gate if `roleLoading` flips `false` before `isAdmin` updates in the same render batch.

### Summary of Changes

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Remove `setTimeout` from `onAuthStateChange` role fetch; add in-flight guard |
| `src/components/ProtectedRoute.tsx` | Harden Discord gate to never redirect while role state is stale |

This is a two-file fix with no database changes.

