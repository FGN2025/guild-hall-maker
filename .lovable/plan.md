## Goal
Remove the "Value" (points prize pool) option from tournament create/edit, and make the explicit 1st/2nd/3rd + participation point fields the single source of truth, with new defaults 15 / 9 / 6 / 3.

## Changes

### 1. `src/components/tournaments/PrizePoolSelector.tsx`
- Remove the "Value" radio option and the whole `prizeType === "value"` block (amount input, distribution percentages, computed payout preview).
- Prize Pool becomes: None / Physical Prize only.
- Drop the now-unused props (`pointsFirst/Second/Third`, `prizePct*`, `onPrizePct*Change`) from the component's interface.

### 2. `src/components/tournaments/CreateTournamentDialog.tsx`
- Defaults: `pointsFirst = "15"`, `pointsSecond = "9"`, `pointsThird = "6"`, `pointsParticipation = "3"` (also in the post-submit reset).
- Remove `prizePctFirst/Second/Third` state and stop passing them to the selector; keep sending fixed 50/30/20 or simply omit the `prize_pct_*` fields on create.
- No other logic change — placement points already save from these inputs.

### 3. `src/components/tournaments/EditTournamentDialog.tsx`
- Same removals of the percentage state/props; if an existing tournament has `prize_type = 'value'`, coerce it to `none` on load (its numeric pool is no longer meaningful) while leaving the saved placement points editable.
- Same new defaults when fields are empty/zero.

### 4. Placement-point resolution (the "actually apply points" part)
Currently both the manage screen and the award function derive placement points from `prize_pool × percentage` when the saved `points_first/second/third` are 0 and `prize_type = 'value'`.
- `src/pages/TournamentManage.tsx`: keep `getPlacementPoints` as a legacy fallback only (saved value wins; derive only when saved is 0 and the tournament still has `prize_type = 'value'`) — this preserves existing tournaments created before this change.
- `supabase/functions/award-tournament-placements/index.ts`: same rule, unchanged behaviour, then redeploy.
Net effect: any tournament created/edited after this change awards exactly the numbers typed into the 1st/2nd/3rd fields, and the manage dropdown shows those same numbers.

### 5. Verification
- Create a tournament leaving defaults → confirm DB rows show `points_first=15, points_second=9, points_third=6, points_participation=3`.
- Open Manage → dropdown reads 15 / 9 / 6 pts; award 1st to a test registration and confirm the season score increments by 15, then Undo restores it.
- Confirm the existing 30-pt-pool tournament still resolves 15/9/6 via the legacy fallback.
- Typecheck + test suite.

## Notes
- No database migration needed; `prize_pool`/`prize_pct_*` columns stay for historical records and are simply no longer written with the "value" type.
- Card/detail `PrizeDisplay` needs no change — it already renders nothing for `none` and the prize name for `physical`.
