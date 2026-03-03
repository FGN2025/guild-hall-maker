# Test Plan: Leaderboard & Rankings

Covers the seasonal leaderboard, tier badges, player profile links, and data source switching between active/completed seasons.

---

## Prerequisites

1. At least one **active** season with 5+ players having `season_scores`.
2. At least one **completed** season with `season_snapshots`.
3. Logged in as any authenticated user.

---

## Phase 1: Active Season Leaderboard

### Test 1.1 — Default View
1. Navigate to `/leaderboard`.
2. **Expected**: The active season is auto-selected. Players are ranked by `points` descending from `season_scores`.

### Test 1.2 — Tier Badge Assignment
1. Check each player's tier badge.
2. **Expected**: Top 5% = Platinum, top 15% = Gold, top 35% = Silver, top 60% = Bronze, rest = no tier badge.

### Test 1.3 — Player Profile Link
1. Click a player name on the leaderboard.
2. **Expected**: Navigates to `/player/{user_id}` showing their profile, stats, and achievements.

### Test 1.4 — Win Rate Calculation
1. Verify the displayed win rate for a player.
2. **Expected**: `Math.round((wins / (wins + losses)) * 100)%`. Shows 0% if no matches.

---

## Phase 2: Completed Season Leaderboard

### Test 2.1 — Switch to Completed Season
1. Use the season selector to pick a completed season.
2. **Expected**: Data loads from `season_snapshots`. Rankings match `final_rank`. Points show `final_points`. Tiers show stored `tier` value.

### Test 2.2 — Frozen Data Integrity
1. Modify a player's profile `display_name` after rotation.
2. **Expected**: Leaderboard still resolves the updated name (profiles are joined live, only scores/ranks are frozen).

---

## Phase 3: Edge Cases

| Scenario | Expected Behavior |
|---|---|
| **No seasons exist** | Empty state message displayed |
| **Season with 0 scores** | "No player activity data yet" |
| **Player deleted their account** | Shows "Unknown" for display_name |
| **Season selector with many seasons** | All seasons listed, scrollable dropdown |

---

## Technical Details

- **Active**: `useSeasonalLeaderboard` queries `season_scores` + `profiles`.
- **Completed**: queries `season_snapshots` + `profiles`.
- **Tier calc (active)**: done client-side based on rank/total percentile.
- **Tier calc (completed)**: stored in snapshot `tier` column.
