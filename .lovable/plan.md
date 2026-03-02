

# Deep Stats Overhaul: Personal + Game-Level Analytics with Skill Insights

## Goal
Transform the Statistics page into a comprehensive analytics hub where players can view stats filtered by both season and game, see their own personal performance dashboard, and get actionable skill improvement suggestions based on how top players perform in each game/genre.

---

## Current State

- **Season Stats tab**: Shows global leaderboard, tier distribution, and progression across seasons
- **Game Stats tab**: Shows per-game tournament/match counts and top players by wins
- **Player Profile page**: Shows overall stats (wins, losses, tournaments) but not broken down by game or season
- No mechanism for players to compare their performance to top performers or get skill improvement insights

---

## Proposed Changes

### 1. Add "My Stats" Tab to the Statistics Page

A new third tab ("My Stats") visible to logged-in users, showing:

- **Overall summary cards**: Total wins, losses, win rate, tournaments played, points earned (across all time)
- **Per-game breakdown table**: Each game the player has competed in, with columns for matches, wins, losses, win rate, and a sparkline trend
- **Per-season breakdown**: A table showing how the player performed in each season (points, rank, tier earned)
- **Skill Gap Analysis panel** (see item 4 below)

**New files:**
- `src/components/stats/MyStatsView.tsx` -- main container for the personal stats tab
- `src/hooks/useMyStats.ts` -- hook that fetches the logged-in user's match_results across all games/seasons and aggregates them

**Modified files:**
- `src/pages/SeasonStats.tsx` -- add third tab "My Stats" (conditionally shown when user is authenticated)

### 2. Combine Season + Game Filtering on Game Stats Tab

Update the Game Stats tab to also allow filtering by season, so users can see game performance within a specific season:

- Add a season selector dropdown alongside the existing game selector
- When both are selected, filter tournaments by date range of the selected season AND game name
- Stat cards and player tables update accordingly

**Modified files:**
- `src/components/stats/GameStatsView.tsx` -- add season selector, pass season date range to the hook
- `src/hooks/useGameStats.ts` -- accept optional season date range to filter tournaments by `start_date` within that range

### 3. Add Per-Game Stats to Player Profile Page

Enhance the existing Player Profile page with a "Stats by Game" section:

- A collapsible accordion listing each game the player has competed in
- For each game: matches, wins, losses, win rate, best tournament finish
- Reuses data from match_results joined to tournaments.game

**Modified files:**
- `src/pages/PlayerProfile.tsx` -- add the new section
- `src/hooks/usePlayerProfile.ts` -- add a new query `usePlayerGameBreakdown(userId)` that groups the player's match_results by game

### 4. Skill Insights / Improvement Suggestions

A "Skill Insights" panel on the My Stats tab that compares the player's per-game stats to the top 10% of players for that game:

- For each game the player has played, calculate:
  - Player's win rate vs. top-10% average win rate
  - Player's average score margin vs. top-10% average score margin
  - Player's tournament participation rate
- Display a simple card per game with:
  - A "strength" badge if they're above average
  - An "area to improve" note if below average, with actionable text like "Your win rate in [Game] is 45% vs. top players at 72%. Focus on consistency."
- Genre-level aggregation: Group games by category and show genre-wide insights (e.g., "You perform best in Fighting games but struggle in Shooters")

**New files:**
- `src/components/stats/SkillInsightsPanel.tsx` -- renders the comparison cards and genre summary
- `src/hooks/useSkillInsights.ts` -- fetches the player's stats and top-player benchmarks per game, computes gaps

**Data source**: All derived from existing `match_results`, `tournaments`, and `games` tables. No new database tables needed.

---

## Technical Details

### Data Flow (no schema changes needed)

All stats are computed client-side from existing tables:

```
games.name <-> tournaments.game <-> match_results.tournament_id
seasons (date range) filters tournaments by start_date
profiles for display names
season_scores / season_snapshots for season-specific points
```

### New Hooks Summary

| Hook | Purpose |
|------|---------|
| `useMyStats(userId)` | Player's overall + per-game + per-season stats |
| `useSkillInsights(userId)` | Compares player to top performers per game/genre |
| `usePlayerGameBreakdown(userId)` | Per-game stats for the player profile page |

### useGameStats changes
- Accept optional `seasonId` parameter
- When provided, fetch the season's date range and add `.gte('start_date', seasonStart).lte('start_date', seasonEnd)` to the tournaments query

### Performance considerations
- All hooks use `useQuery` with specific query keys for caching
- Skill insights hook fetches top-player benchmarks once and caches them
- Match results queries are bounded (player-specific queries return manageable row counts)

### Authentication gating
- "My Stats" tab only renders when `useAuth()` returns a valid user
- If not logged in, show a prompt to sign in to view personal stats

---

## File Change Summary

| Action | File |
|--------|------|
| Create | `src/components/stats/MyStatsView.tsx` |
| Create | `src/hooks/useMyStats.ts` |
| Create | `src/components/stats/SkillInsightsPanel.tsx` |
| Create | `src/hooks/useSkillInsights.ts` |
| Modify | `src/pages/SeasonStats.tsx` (add My Stats tab) |
| Modify | `src/components/stats/GameStatsView.tsx` (add season filter) |
| Modify | `src/hooks/useGameStats.ts` (accept season filter) |
| Modify | `src/pages/PlayerProfile.tsx` (add per-game breakdown) |
| Modify | `src/hooks/usePlayerProfile.ts` (add game breakdown query) |

No database migrations, no new tables, no RLS changes required.

