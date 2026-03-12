

## Simplify Tournament Season Points to Participation Only

Both the **Edit Tournament** and **Create Tournament** dialogs currently show a 4-column grid for season points (1st, 2nd, 3rd, Participation). Per the existing tournament system design where points are awarded per match (both winners and losers get participation points), only the single "Participation Points" field is needed.

### Changes

**1. `src/components/tournaments/EditTournamentDialog.tsx`**
- Remove `pointsFirst`, `pointsSecond`, `pointsThird` state variables (lines 89-91)
- Remove their hydration in `useEffect` (lines 108-110)
- Remove them from the `onUpdate` payload (lines 182-184)
- Replace the 4-column "Season Points" grid (lines 330-351) with a single "Participation Points" input bound to `pointsParticipation`
- Send `points_first: 0, points_second: 0, points_third: 0` as hardcoded values in the update payload so they're zeroed out

**2. `src/components/tournaments/CreateTournamentDialog.tsx`**
- Same pattern: remove `pointsFirst`, `pointsSecond`, `pointsThird` state and form fields
- Replace the 4-column grid (lines 316-336) with a single "Participation Points" input
- Hardcode `points_first: 0, points_second: 0, points_third: 0` in the insert payload

No database changes needed — the columns remain but will be set to 0 for tournaments.

