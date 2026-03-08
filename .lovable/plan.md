

## Updated Requirement: Registration Count Visible to Platform Admins Only

The rule has changed: **only Platform Admins** (not Moderators) should see the registration count (e.g. `8/16`). Everyone else sees `"16 max"`.

### Files to Update

Six files display `registrations_count`. Two were already updated but need the `isModerator` check removed:

| File | What changes |
|------|-------------|
| `src/components/tournaments/TournamentCard.tsx` | Change `showRegCount` from `isAdmin \|\| isModerator` to `isAdmin` only |
| `src/components/FeaturedTournaments.tsx` | Same — remove `isModerator` from the check |
| `src/pages/moderator/ModeratorTournaments.tsx` | Add `useAuth` check; conditionally show `max_participants + " max"` in list view (line 204), grid view (line 273), and detail dialog (line 331) |
| `src/pages/admin/AdminTournaments.tsx` | Already admin-only page, but add the guard for consistency |
| `src/pages/TournamentDetail.tsx` | Add conditional — show count only for admins, otherwise `"max_participants max"` (line 148) |
| `src/components/tournaments/TournamentDetailsDialog.tsx` | Same conditional on line 50 |
| `src/pages/Dashboard.tsx` | Same conditional on line 99 |

### Logic
All files use the same pattern:
```typescript
const { isAdmin } = useAuth();
// Display value:
isAdmin ? `${count}/${max}` : `${max} max`
```

Seven files, one-line change each (plus import if not already present). No database or backend changes.

