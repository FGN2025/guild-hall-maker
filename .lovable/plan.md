

## Remove "Create Tournament" from Public Tournaments Page

The button is currently showing because the logged-in user has Admin/Moderator/Tenant roles — the role gating is working correctly. However, if the intent is that tournament creation should **only** happen from the Admin/Moderator panels (not the public page at all), the fix is straightforward:

### Change

**`src/pages/Tournaments.tsx`**
- Remove the `CreateTournamentDialog` rendering entirely (lines 93-94)
- Remove the `canCreate` variable
- Remove the `CreateTournamentDialog` import
- Remove `createTournament` and `isCreating` from the `useTournaments()` destructure
- Keep the "Sign In to Register" button for unauthenticated users

The Create Tournament functionality remains available on the Admin Tournaments page (`/admin/tournaments`) where it was added in the previous change.

