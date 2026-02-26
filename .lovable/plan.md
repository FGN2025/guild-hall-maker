

## Leaderboard: Positive Stats Only

### Goal
Redesign the leaderboard to celebrate player participation and achievement rather than exposing losses or win rates. The four featured categories will be:
- **Most Matches Participated**
- **Most Wins**
- **Most Points Earned**
- **Most Hours Played** (new data point -- see note below)

### Key Changes

#### 1. Remove Negative/Shaming Stats from UI
Remove from both the **Seasonal** and **All-Time** tabs:
- Losses column (the red "L" column)
- Win Rate column and progress bars
- The "W / L / D" text on the podium cards
- Draws column (optional -- draws aren't negative but don't fit the new categories)
- The `TrendingUp` / `Minus` indicator icon that implies underperformance

#### 2. Restructure the Leaderboard Columns

**Seasonal Tab** -- new column layout:
| Rank | Player | Tier | Points | Wins | Matches |

**All-Time Tab** -- new column layout:
| Rank | Player | Points | Wins | Matches |

The sort options will be updated to: `rank`, `wins`, `total_matches`, `points`.

#### 3. Update the Podium (Top 3 Cards)
Replace the `{wins}W / {losses}L / {draws}D` line with:
- Points earned and total matches played (positive framing)

#### 4. Update the Sort Type
Change the `SortKey` type from `"rank" | "win_rate" | "total_matches" | "wins" | "losses" | "draws"` to `"rank" | "total_matches" | "wins" | "points"`.

Default sort will rank by **points** (seasonal) or **wins** (all-time) rather than win rate.

#### 5. Update the Ranking Algorithm
In `useLeaderboard.ts`, change the sort logic from win-rate-first to:
1. Most wins (primary)
2. Most matches played (tiebreaker)

This ensures the ranking itself doesn't penalize players who participate a lot but lose some matches.

#### 6. "Most Hours Played" -- Data Consideration
The current database does not track play time / hours. Two options:

**Option A (Recommended for now):** Skip "Hours Played" until a tracking mechanism exists. Use "Most Matches Participated" as the engagement metric instead -- it's already available.

**Option B (Future):** Add a `play_time_minutes` column to `match_results` or `season_scores` and aggregate it. This requires match duration tracking which is a separate feature.

The plan will proceed with Option A -- the four visible categories will effectively be **Matches, Wins, Points, Tier** (seasonal) and **Matches, Wins, Points** (all-time).

#### 7. Update Player Profile Stats Grid
In `PlayerStatsGrid.tsx`, replace the current 4-stat grid (Wins, Losses, Draws, Win Rate) with positive stats:
- **Wins** (keep)
- **Matches Played** (rename from total, positive framing)
- **Points Earned** (pull from season data)
- **Tournaments Played** (already available)

#### 8. Update Player Profile Header
Remove the "Win Rate %" display from `PlayerProfileHeader.tsx` and replace with "Points" or "Matches".

### Technical Summary

**Files modified:**
- `src/pages/Leaderboard.tsx` -- Remove losses/win-rate columns, update podium, update sort keys
- `src/hooks/useLeaderboard.ts` -- Change ranking sort from win-rate to wins-first, remove `win_rate` from the interface (or keep but don't display)
- `src/components/player/PlayerStatsGrid.tsx` -- Replace losses/draws/win-rate with positive stats
- `src/components/player/PlayerProfileHeader.tsx` -- Replace win-rate display with matches or points

**No database changes required.** All data already exists; this is purely a UI/presentation change.

