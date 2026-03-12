

## Restrict Tournament Creation to Staff & Add to Admin Page

### Problem
The "Create Tournament" button is currently visible to all authenticated users on the public `/tournaments` page. It should only be available to Admins, Moderators, and Tenant Admins.

### Changes

**1. `src/pages/Tournaments.tsx`** — Gate the Create button behind role checks
- Import `isModerator`, `isAdmin`, `isTenantStaff` from `useAuth()`
- Only render `<CreateTournamentDialog>` when the user has one of those roles
- Non-staff authenticated users see no create button; unauthenticated users continue to see "Sign In to Register"

**2. `src/pages/admin/AdminTournaments.tsx`** — Add Create Tournament to admin panel
- Import `CreateTournamentDialog` and wire it to a create mutation (insert into `tournaments` with `created_by: user.id`)
- Place the button in the page header alongside the existing view-mode toggle buttons

