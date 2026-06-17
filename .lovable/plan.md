# Tournament Points: Diagnosis + Fix Plan

## What's actually happening (DB evidence)

I checked the live `tournaments` table for completed events. Two distinct problems are visible:

| Tournament | Format | 1st / 2nd / 3rd configured | Placement rows recorded |
|---|---|---|---|
| Mario Kart World – Mar 10 | single_elimination | 10 / 5 / 3 | **0** |
| Fortnite Solo / No Build | battle_royale | 15 / 10 / 8 | **0** |
| Marvel Rivals Game Night – Mar 12 | swiss | 10 / 5 / 3 | **0** |
| Forza 6 | single_elimination | 0 / 0 / 0 | 2 (worth 0 pts) |
| Minecraft – May 5 | single_elimination | 0 / 0 / 0 | 2 (worth 0 pts) |

So placement points fail for two reasons:

1. **Auto-award only runs for `single_elimination`.** In `useTournamentManagement.ts` (final-match handler) we only invoke `award-tournament-placements` when the format includes "single". Battle royale, swiss, round robin, etc. never trigger it — moderators have to remember to open the Placement Validator Panel, and several haven't.
2. **Some tournaments were created with `points_first/second/third = 0`.** Forza and Minecraft were saved that way, so even the placements that *were* recorded credited 0 points to `season_scores`. The award function does its job; the config is empty.

Participation points, on the other hand, are firing on **every completed match** for **both players** (`useTournamentManagement.ts` line ~272, plus the reconciler backfill on `match_point_awards`). That's why players see participation but no placement — participation is being over-paid per match, placement is being under-paid (or never paid) per tournament.

## What we'll change

### 1. Make placement-award the default for all formats
- In `useTournamentManagement`, when the **tournament status flips to `completed`** (not when a match score is saved), invoke `award-tournament-placements` regardless of format. Existing auto-detect already only fills 1st/2nd/3rd from a single-elim bracket; other formats require the validator panel to be opened by a moderator, but at minimum the function call happens and surfaces a toast prompt if placements aren't resolved.
- Add a visible banner on `TournamentManage` for any **completed** tournament that has 0 rows in `tournament_placements`, linking straight to the Placement Validator Panel. Moderators stop forgetting.
- Add a one-time backfill script for the three tournaments above that have proper point values but no placement rows (Mario Kart, Fortnite, Marvel Rivals): admin clicks a "Backfill placements" action in the validator panel, picks winners, function does the rest. No silent data writes.

### 2. Flag zero-point tournaments at creation/edit
- In `CreateTournamentDialog` / `EditTournamentDialog`, warn if `points_first = 0` while the tournament is being saved as anything other than a casual/exhibition. This prevents future Forza/Minecraft situations.

### 3. Tie participation points to attendance, not registration
- **Schema migration** on `tournament_registrations`:
  - Add `attended boolean NOT NULL DEFAULT false`
  - Add `checked_in_at timestamptz`
  - Add `checked_in_by uuid` (moderator who marked them)
- **Auto-attendance**: when a player appears as `player1_id` or `player2_id` in any `match_results` row for that tournament with `status='completed'`, mark them attended. Implement as a trigger on `match_results` so it stays in sync.
- **Manual check-in**: add an "Attendance" column to the Registered Players list in `TournamentManage` with a toggle per row for formats where matches don't exist (battle royale standings imported manually, etc.).
- **Stop per-match participation payout**: remove the `awardSeasonPoints(winnerId, loserId, participationPts, participationPts, ...)` call from the match-completion handler. Win/loss credits stay (those track record). Participation moves to a single payout.
- **New single payout**: when the tournament transitions to `completed`, the `award-tournament-placements` function (extended) loops over `tournament_registrations` where `attended = true`, and writes exactly one `match_point_awards`-equivalent row per attended player with `kind = 'participation'` and `points = tournaments.points_participation`, then credits `season_scores`. Idempotent via a unique index `(tournament_id, user_id, kind='participation')`.
- **Reconciler update**: `reconcile-tournament-points` switches from "credit participation per match" to "credit participation once per attended player per tournament". Same idempotency key.

### 4. Backfill existing data safely
- One-off SQL (run as a migration): for every completed tournament, mark `attended = true` on any registration whose `user_id` appears in a completed match for that tournament. No new credits issued yet.
- Then surface a "Reconcile points" button in the admin tournaments page that calls the existing `reconcile-tournament-points` function in `dry_run` mode first, shows the diff, and only commits on confirmation. Avoids silently double-paying anyone.

## Technical notes (for devs)

- Auto-award trigger point moves from `updateMatchScore` mutation to a new `useEffect`/server-side hook that watches `tournaments.status -> 'completed'`. Easiest: fire from the existing "Mark tournament complete" action in `TournamentManage` plus the final-match-of-single-elim path (kept as a convenience).
- Attendance trigger:
  ```sql
  CREATE OR REPLACE FUNCTION public.mark_attended_from_match() RETURNS trigger ...
    UPDATE tournament_registrations SET attended=true, checked_in_at=now()
    WHERE tournament_id = NEW.tournament_id
      AND user_id IN (NEW.player1_id, NEW.player2_id)
      AND attended = false;
  ```
- Unique index for participation idempotency:
  ```sql
  CREATE UNIQUE INDEX match_point_awards_participation_uniq
    ON match_point_awards (tournament_id, user_id)
    WHERE kind = 'participation';
  ```
- All RLS already allows mods/admins to update `tournament_registrations`; no policy changes needed for attendance toggle.

## Out of scope (call out, don't build)
- Changing the points rubric defaults.
- Migrating already-paid per-match participation off `season_scores`. Existing balances stay; only future tournaments use the new rule. We can offer a separate "rebalance season" action later if you want to retroactively normalize.
