

## Plan: Simplify Challenge Points to Single "Points" Field

Challenges should have a single points reward value. The 1st/2nd/3rd place rankings are handled manually by moderators at end-of-month season close, not per-challenge.

### Files to Update

**1. `src/components/challenges/CreateChallengeDialog.tsx`**
- Change `defaultForm` to have only `points: "10"` (remove `points_first`, `points_second`, `points_third`, `points_participation`)
- Update the insert to set `points_first` = points value, and zero out `points_second`, `points_third`, `points_participation` (DB columns stay, just unused)
- Replace the 4-column points grid with a single "Points" input field
- Update label from "Season Points" to "Points"

**2. `src/components/challenges/EditChallengeDialog.tsx`**
- Remove `pointsSecond`, `pointsThird`, `pointsParticipation` state variables
- Keep only `pointsFirst` (rename to just `points` conceptually) 
- Replace the 4-column points grid (lines 298-314) with a single "Points" input
- Update the mutation to set `points_second: 0`, `points_third: 0`, `points_participation: 0`

**3. `src/pages/admin/AdminChallenges.tsx`**
- Change card label from "1st Pts" to "Pts" (line ~439)
- Change detail stat label from "1st Place Pts" to "Points" (line ~630)
- Replace the 4-column "Points Breakdown" grid (lines ~629-633) with a single points display

**4. `src/pages/moderator/ModeratorChallenges.tsx`**
- Same changes as AdminChallenges: card label, detail stat label, remove breakdown grid

**5. `src/pages/ChallengeDetail.tsx`**
- Already shows single `points_first` as "Points" — no change needed

**6. `src/components/challenges/ChallengeCard.tsx`**
- Already shows `+{c.points_first} pts` — no change needed

No database migration needed — the columns remain, we just stop exposing the multi-tier UI.

