## Diagnosis

Participation points work because `useTournamentManagement.updateScoreMutation` calls `award-season-points` after every match score, awarding `tournament.points_participation` to both players.

**Placement points (1st / 2nd / 3rd) are never awarded — there is no code path that reads `points_first`, `points_second`, `points_third` and credits players.**

Evidence:
- `rg "points_first|points_second|points_third"` across `supabase/functions` and hooks shows the columns are only **read for display** (TournamentDetail, AdminPointsRubric) or **set on create/copy/align** (CreateTournamentDialog, copy, align-points-to-rubric). No call site awards them.
- `award-season-points/index.ts` only handles a single winner/loser pair with `points_winner`/`points_loser` — it has no concept of placement.
- A DB trigger (`notify_moderators_tournament_complete`, migration `20260301021756`) already notifies moderators that *"Tournament Placements Need Validation"* when the final match completes — but the **validation UI and the award action don't exist**. The notification is a dead end.
- `ModeratorGuide.tsx` line 98 even tells moderators *"Tournament placement points are awarded automatically"* — which is false today.

So 1st/2nd/3rd are silently skipped on every completed tournament.

## Fix Plan

### 1. New edge function: `award-tournament-placements`
- Auth: admin or moderator only (mirror `award-season-points`).
- Input: `{ tournament_id, first_id, second_id, third_id? }`.
- Loads tournament → `points_first`, `points_second`, `points_third`, `game`.
- Resolves active season (game-specific → global, same logic as `award-season-points`).
- Idempotency: insert a row in a new `tournament_placements` table `(tournament_id, place, user_id)` with `UNIQUE(tournament_id, place)` — if conflict, skip the credit so re-clicking can't double-award.
- For each placement, upsert `season_scores.points` and `season_scores.points_available` by the configured amount (no W/L change).
- Auto-award the tournament's linked `achievement_id` to 1st place if set.
- Marks `tournaments.status = 'completed'` if not already.

### 2. New table: `tournament_placements`
- Columns: `id, tournament_id, place (1|2|3), user_id, points_awarded, awarded_by, awarded_at`.
- `UNIQUE(tournament_id, place)` for idempotency.
- RLS: read = anyone authenticated; write = admin/moderator (via `has_role`).

### 3. Auto-detect placements from the bracket (single-elimination)
Add a helper inside the function that, when `first_id`/`second_id`/`third_id` aren't passed, computes them from `match_results`:
- 1st = `winner_id` of the final (max round).
- 2nd = the loser of the final.
- 3rd = loser of the higher-seeded semifinal (or both semifinal losers if a 3rd-place match doesn't exist — pick the one with more total wins, ties broken by earlier `completed_at`).
This lets us call the function automatically when the final match is scored.

### 4. Hook into match scoring
In `src/hooks/useTournamentManagement.ts` `updateScoreMutation`, after the existing per-match award block, detect "this was the final" (current round equals MAX(round) for the tournament and no next round exists). If so:
- Call `award-tournament-placements` with `tournament_id` only (auto-detection path).
- Toast: *"Placement points awarded"*.
- Invalidate `["tournaments"]`, `["manage-tournament"]`, `["leaderboard"]`.

### 5. Manual placement validation UI (Moderator)
Replace the dead-end notification with action. In `ModeratorTournaments.tsx` detail dialog, when `status === 'completed'` (or final match done), add a **"Validate Placements"** panel showing auto-detected 1st/2nd/3rd with player pickers (in case of ties / non-bracket formats), a `points_first/second/third` preview, and an **"Award Placement Points"** button that calls the edge function with the chosen user IDs. Admins get the same panel via `AdminTournaments`.

### 6. Backfill (optional, ask before running)
A one-off script/migration that finds completed tournaments with no `tournament_placements` rows, derives placements from `match_results`, and credits the missing points. Recommend running this after the user reviews a dry-run list.

### 7. Verification
- Unit-style test by curling `award-tournament-placements` for a recent completed tournament, then checking `season_scores` deltas and the `tournament_placements` row.
- End-to-end: score a test bracket's final → confirm winner gets `points_first`, runner-up gets `points_second`, semifinal loser gets `points_third`, and re-running doesn't double-credit.
- Update `ModeratorGuide.tsx` wording to match reality (now actually automatic on final match).

### Open questions
- For non-single-elimination formats (round-robin, double-elim), how should we determine 1st/2nd/3rd? Default plan: require manual selection in the moderator panel; auto-detection only runs for single-elim. Confirm?
- Should we backfill historical completed tournaments, or only fix forward from now?