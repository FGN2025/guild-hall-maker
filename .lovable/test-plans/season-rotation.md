# Test Plan: Season Rotation

End-to-end testing of the season lifecycle: creation, active play, rotation (snapshot + completion + new season), and data integrity across the leaderboard and stats views.

---

## Prerequisites

1. Logged in as **Admin** (has `admin` role in `user_roles`).
2. At least **one active season** exists with `season_scores` data for 2+ players.
3. The `rotate-season` edge function is deployed.

---

## Phase 1: Season Creation (Admin Panel)

### Test 1.1 — Create a New Season
1. Navigate to `/admin/seasons`.
2. Click **New Season**.
3. Fill in: Name = "Test Season", Start = today, End = 1 month from now.
4. Click **Create Season**.
5. **Expected**: Toast "Season created." Season appears in the list with status `upcoming`.

### Test 1.2 — Verify Season List Display
1. Confirm all seasons display with correct name, date range, and status badge.
2. **Expected**: Active season shows `default` badge variant, completed shows `secondary`, upcoming shows `outline`.

### Test 1.3 — RLS Enforcement
1. Verify the `seasons` table has RLS policies: admins can manage, anyone can view, service-role-only INSERT/UPDATE policies exist.
2. **Expected**: Non-admin users cannot create or modify seasons (only the admin `ALL` policy and the service-role policies allow writes).

---

## Phase 2: Active Season — Points Accumulation

### Test 2.1 — Verify Points Exist for Active Season
1. Query `season_scores` for the active season.
2. **Expected**: At least 2 players have `points > 0`, `wins >= 0`, `losses >= 0`.

### Test 2.2 — Leaderboard Reflects Live Scores
1. Navigate to `/leaderboard` (or `/season-stats`).
2. Select the active season.
3. **Expected**: Players are ranked by points descending. Tier badges (platinum/gold/silver/bronze) are assigned based on percentile (top 5%/15%/35%/60%).

### Test 2.3 — Season Stats Dashboard
1. Navigate to `/season-stats`, select the active season.
2. **Expected**: Total Players, Total Matches, Total Points, and Avg Pts/Match cards display correct aggregates from `season_scores`. Top Players bar chart renders.

---

## Phase 3: Season Rotation (Edge Function)

### Test 3.1 — Rotate Season via Admin Panel
1. Ensure the active season's `end_date` is in the past (or set it to a past date via DB for testing).
2. Navigate to `/admin/seasons`.
3. Click **Rotate Season**.
4. **Expected**: Toast "Season rotation triggered." After refresh:
   - The old active season now shows status `completed`.
   - A new season appears with status `active`, named `Season YYYY-MM`, starting 1 second after the old end date.

### Test 3.2 — Snapshots Created
1. Query `season_snapshots` for the just-completed season ID.
2. **Expected**: One row per player who had `season_scores` data. Each row has:
   - `final_rank` (1-indexed, ordered by points desc)
   - `final_points` matching the player's score
   - `tier` assigned correctly (top 5% = platinum, 15% = gold, 35% = silver, 60% = bronze, rest = none)
   - `wins` and `losses` carried over

### Test 3.3 — Old Season Scores Preserved
1. Query `season_scores` for the completed season.
2. **Expected**: Rows still exist (not deleted). The `points`, `wins`, `losses` values match snapshot `final_points`, `wins`, `losses`.

### Test 3.4 — New Season is Empty
1. Query `season_scores` for the newly created active season.
2. **Expected**: No rows (fresh season, no scores yet).

### Test 3.5 — Rotation When Season Not Yet Ended
1. Ensure the active season's `end_date` is in the future.
2. Click **Rotate Season**.
3. **Expected**: Function returns `{ success: true, message: "Season still active" }`. No status change, no snapshots created.

### Test 3.6 — Rotation With No Active Season
1. Temporarily set all seasons to `completed` (no active season).
2. Invoke `rotate-season` via edge function call.
3. **Expected**: Returns `{ success: false, message: "No active season found" }`. No crash, no new season created.

### Test 3.7 — Rotation Idempotency
1. Run rotation twice on an already-completed season.
2. **Expected**: Second call returns "No active season found" (since the original was already completed and the new one hasn't ended). No duplicate snapshots.

---

## Phase 4: Post-Rotation Data Integrity

### Test 4.1 — Completed Season Leaderboard
1. Navigate to `/leaderboard`, select the completed season.
2. **Expected**: Leaderboard reads from `season_snapshots` (not `season_scores`). Rankings, tiers, and points match snapshot data. Player names resolve via profiles.

### Test 4.2 — Completed Season Stats
1. Navigate to `/season-stats`, select the completed season.
2. **Expected**: Stats are built from snapshots (`buildFromSnapshots`). Tier distribution pie chart shows correct counts. Top Players table displays frozen data.

### Test 4.3 — Season Progression Chart
1. Navigate to `/season-stats`.
2. **Expected**: The Season Progression line chart shows data points for completed seasons (from snapshots) and the current active season (from live scores, with "(live)" label).

### Test 4.4 — New Active Season Leaderboard
1. Select the new active season on the leaderboard.
2. **Expected**: Empty state — "No player activity data yet" or equivalent, since no matches have been played.

---

## Phase 5: Edge Cases

| Scenario | Expected Behavior |
|---|---|
| **0 players in season** | Rotation completes, 0 snapshots created, new season starts normally |
| **1 player in season** | Single snapshot with rank=1, tier=platinum (top 5% of 1 = 100%) |
| **Tied points** | Players with equal points get sequential ranks (no tie-breaking logic — rank is insertion order) |
| **Very large season (1000+ scores)** | Rotation handles all rows; tier percentiles calculated correctly |
| **Season end_date exactly now()** | Rotation should trigger (now >= endDate) |

---

## Technical Details

- **Edge function**: `rotate-season/index.ts` uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS.
- **Snapshot insert**: Uses service role, bypassing the `false` WITH CHECK on `season_snapshots` INSERT policy.
- **Tier calculation**: `rank / total` percentile — top 5% platinum, 15% gold, 35% silver, 60% bronze, rest none.
- **New season naming**: `Season YYYY-MM` based on the month after the old season ends.
- **Client-side branching**: `useSeasonalLeaderboard` and `useSeasonStats` check `season.status` to decide between `season_scores` (active) vs `season_snapshots` (completed).
