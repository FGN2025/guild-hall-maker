

## Fix: `Can't find variable: isAdmin` in ModeratorTournaments

### Root Cause
The saved file at `src/pages/moderator/ModeratorTournaments.tsx` is correct — line 37 already has `const { user, isAdmin } = useAuth()`. However, the browser's hot-reload is running a stale version (the error points to line 665, but the file is only 413 lines).

### Fix
A trivial no-op edit (e.g., adding/removing a blank line) to `src/pages/moderator/ModeratorTournaments.tsx` will force a fresh HMR update and clear the stale module. This will resolve the runtime crash immediately.

### Single file change
**`src/pages/moderator/ModeratorTournaments.tsx`** — touch the file to trigger a rebuild. No logic changes needed; the code is already correct.

