

## High Priority 7.5: Hide Player Registration Count from Non-Admin/Moderator Users

### Problem
Tournament cards currently show registration counts (e.g. "8/16 Players") to all users, including regular players and tenant admins. This data should only be visible to platform Admins and Moderators.

### Affected Components
1. **`src/components/tournaments/TournamentCard.tsx`** — Shows `{t.registrations_count}/{t.max_participants}` in the Players stat tile
2. **`src/components/FeaturedTournaments.tsx`** — Shows `{regCount}/{max_participants}` in the Players stat tile on the landing page (public, unauthenticated)

### Plan

**Both components** will use `useAuth()` to check `isAdmin` and `isModerator`:

- **TournamentCard.tsx**: Already imports `useAuth`. Conditionally render the Players tile content:
  - Admin/Moderator: Show `"8/16"` (current behavior)
  - Everyone else: Show just the `max_participants` value, e.g. `"16 max"` — so players still know the tournament size but not how many have registered

- **FeaturedTournaments.tsx**: Import `useAuth`. Apply the same conditional logic to the Players stat in the featured cards on the landing page. Since this is a public page (often unauthenticated), non-privileged users will see `"16 max"` instead of `"5/16"`.

### Changes Summary
| File | Change |
|------|--------|
| `TournamentCard.tsx` | Conditionally show registration count vs. max-only based on role |
| `FeaturedTournaments.tsx` | Import `useAuth`, apply same conditional to featured card Players tile |

Two files, minimal logic change. No database or backend changes needed.

