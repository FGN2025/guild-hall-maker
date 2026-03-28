

## Add "Generate with Agent" to Admin Challenges Page + Admin Route

### What Changes

1. **`src/pages/admin/AdminChallenges.tsx`** (~line 304): Add a "Generate with Agent" button next to "New Challenge", navigating to `/admin/challenges/generate`

2. **`src/App.tsx`**: Add a new route `/admin/challenges/generate` wrapped in `AdminRoute`, pointing to the same `ModeratorCDLGenerate` component (it already has RBAC checks for admin/moderator)

3. **`src/pages/moderator/ModeratorCDLGenerate.tsx`**: Update the "Back" navigation to detect whether the user came from `/admin` or `/moderator` and navigate back accordingly (check `location.pathname` or use `navigate(-1)`)

### Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/AdminChallenges.tsx` | Add "Generate with Agent" button (line ~304) |
| `src/App.tsx` | Add `/admin/challenges/generate` route under AdminRoute |
| `src/pages/moderator/ModeratorCDLGenerate.tsx` | Make back-navigation context-aware |

No backend changes needed — the edge functions already allow both admin and moderator roles.

