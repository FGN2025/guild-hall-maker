
## What I found

I audited every point-awarding source against `season_scores` (the wallet). Challenge and quest approvals are crediting points correctly, but **tournament credits have multiple gaps**.

### Wallet vs. earned sources

| Source | Earned | Credited to wallet | Status |
|---|---|---|---|
| Challenges (`challenge_completions.awarded_points`) | 305 pts across 2 players | All present in `season_scores` | ✅ OK |
| Quests (`quest_completions.awarded_points`) | 5 pts (1 player) | Present | ✅ OK |
| Tournament placements (1st/2nd/3rd) | **0 rows** in `tournament_placements` | — | ❌ Never awarded |
| Tournament match participation/win | 2 completed matches | Only 1 player credited; 1 player has no `season_scores` row at all | ⚠️ Partial |

### Concrete gaps

1. **4 tournaments are marked `completed` with zero placement rows** — no player got 1st/2nd/3rd points:
   - Minecraft Tournament – May 5
   - Fortnite Tournament – Solo / No Build
   - Marvel Rivals Game Night – Mar 12
   - Mario Kart World Tournament – Mar 10

   The `award-tournament-placements` edge function exists but was never invoked for these. The trigger `notify_moderators_tournament_complete` only nags moderators; nothing auto-runs.

2. **Match participation points are dropped for some players** — match `94988b1b` (LoL Championship, `in_progress`) has 2 completed matches and a winner (`550e8400…`) who has no row in `season_scores`. The award path runs only when a moderator submits a score through the UI, so any score saved directly (seed data, deleted moderator session, anonymous insert) silently skips the credit.

3. **`tournaments_played` counter is out of sync** — only 3 of 8 active players have a non-zero count, but many more matches and registrations exist.

4. **No reconciliation report** today, so the only way to spot drift is the manual SQL I just ran.

## Plan

### A. Backfill the missing tournament points (one-time)

Build a `reconcile-tournament-points` edge function (admin-only) that:
- For every `completed` tournament without `tournament_placements`, calls the existing placement-detection logic from `award-tournament-placements` and inserts placements + credits 1st/2nd/3rd to `season_scores`.
- For every `completed` match where winner/loser is missing the participation credit (no matching `season_scores` increment since the match's `completed_at`), inserts the missing points and increments `wins`/`losses`/`tournaments_played`.
- Idempotent: uses the `tournament_placements` unique constraint and a new `match_point_awards` ledger (see B) to avoid double-credits.
- Returns a per-player diff report before/after.

Run it once from Admin → Settings with a "Dry run" toggle so you can review before committing.

### B. Make match-point awards auditable and idempotent

Add a small ledger `match_point_awards(match_id, user_id, kind, points, awarded_at)` with a unique `(match_id, user_id, kind)` constraint (kinds: `participation`, `win`). Update the match-score submission path to insert into this ledger inside the same transaction that updates `season_scores`. This:
- Prevents double-awarding if the moderator re-saves a score.
- Lets the reconciliation function detect missing credits deterministically.
- Gives players a real audit trail.

### C. Auto-trigger placements when the final match is recorded

Extend `notify_moderators_tournament_complete` (or a new trigger) so that when the championship match completes, it also enqueues a call to `award-tournament-placements` via `pg_net` with `dry_run=false`. Today moderators have to click manually, which is the root cause of #1.

### D. Wallet reconciliation report on the Admin Dashboard

Add a "Points Wallet Health" card that surfaces, per player:
- Sum of `challenge_completions.awarded_points` + `quest_completions.awarded_points` + `tournament_placements.points_awarded` + `match_point_awards.points` + `point_adjustments.points_change` − `prize_redemptions.points_spent` (approved/fulfilled)
- vs. `SUM(season_scores.points)` and `SUM(season_scores.points_available)`
- Highlight any player with a non-zero delta and offer a "Reconcile this player" button (calls the same edge function scoped to one user).

### E. Tests / verification

- After backfill, re-run the audit SQL — every player's expected total must equal `season_scores.points`.
- Add a Vitest case that calls the reconciliation function in dry-run mode against the current DB and asserts zero diffs (regression guard).
- Submit a test match score end-to-end and confirm both players get a `match_point_awards` row plus the wallet delta.

### Technical notes

- All new DB objects need GRANTs + RLS (admin-only writes; players can read their own `match_point_awards`).
- The edge function will use the service-role client with `persistSession: false`, validate the caller via `getClaims`, and require `admin` role.
- No schema changes to `season_scores` itself — we keep `points` (lifetime) and `points_available` (spendable) and only add the missing increments.

### Out of scope

- Recomputing seasonal leaderboards historically (the wallet fix already feeds the existing leaderboard query).
- Changing point values on any existing tournament/challenge — only crediting what was already configured.
