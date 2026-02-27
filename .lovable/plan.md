

## Add "Reset Bracket" Feature for Tournament Management

### Problem
Once an admin/moderator generates a bracket, there is no way to undo it. The "Generate Bracket" button disappears and the tournament moves to `in_progress` status. If the admin needs to add more players or make changes before play begins, they are stuck.

### Solution
Add a "Reset Bracket" button that deletes all match results for the tournament and resets its status back to `open`, allowing further registration changes before re-generating.

### Changes

**1. Add `resetBracket` mutation to `useTournamentManagement.ts`**
- New mutation that:
  - Deletes all rows from `match_results` where `tournament_id` matches
  - Updates the tournament status back to `open`
  - Invalidates relevant query caches
- Include a confirmation guard in the UI (not the hook) to prevent accidental resets

**2. Update `TournamentManage.tsx` UI**
- When matches exist (`hasMatches` is true), show a "Reset Bracket" button in the players panel (where the Generate button used to be)
- Wrap it in an `AlertDialog` confirmation: "Are you sure? This will delete all match results and reset the tournament to Open status."
- After reset, the Generate Bracket button will naturally reappear since `hasMatches` becomes false again

### Technical Details

Reset mutation SQL logic:
```sql
DELETE FROM match_results WHERE tournament_id = :id;
UPDATE tournaments SET status = 'open' WHERE id = :id;
```

No RLS changes needed -- the existing "Tournament creators can update matches" and "Moderators can manage match results" (with DELETE) policies already cover this. The tournament creator can also update the tournament status via existing policies.

The reset button will only appear when:
- Matches exist (bracket has been generated)
- No matches have been completed yet (safety check to prevent resetting mid-tournament)

If any matches are already completed, the button will be disabled with a tooltip explaining that completed matches prevent a reset.

### Files to Modify
1. `src/hooks/useTournamentManagement.ts` -- add `resetBracketMutation`
2. `src/pages/TournamentManage.tsx` -- add Reset Bracket button with AlertDialog confirmation

