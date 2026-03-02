

# Add Game-Level Stats to the Stats Page

Currently the Stats menu only shows season-level statistics. This plan adds a **Game Stats** tab so players can see performance data broken down by individual game.

## Overview

Add a tabbed interface to the Stats page with two tabs: **Season Stats** (existing) and **Game Stats** (new). The Game Stats tab lets users pick a game and see aggregated match/tournament data for that game.

## Data Model

No database changes needed. Game stats are derived from existing tables:
- `tournaments` (linked to games by `game` column matching `games.name`)
- `match_results` (linked to tournaments by `tournament_id`)
- `profiles` (for player display names)

The query chain: games -> tournaments (by game name) -> match_results (by tournament_id) -> aggregate wins, losses, matches per player.

## Changes

### 1. Create `src/hooks/useGameStats.ts`
A new hook that, given a game name:
- Fetches all tournaments for that game
- Fetches all match_results for those tournaments
- Aggregates per-player stats: total matches, wins, losses, win rate
- Returns summary cards (total tournaments, total matches, total unique players) and a top players list
- Also provides an "all games overview" query that shows total tournaments and matches per game for a summary view

### 2. Create `src/components/stats/GameStatsView.tsx`
A new component rendering:
- A game selector dropdown (populated from the games list)
- Summary stat cards (Total Tournaments, Total Matches, Unique Players)
- Top Players bar chart (reusing the same Recharts pattern as season stats)
- Most Active Players table (same pattern as season stats)
- When no game is selected, show an overview grid of all games with their tournament/match counts

### 3. Update `src/pages/SeasonStats.tsx`
- Wrap the existing content and the new GameStatsView in a `Tabs` component
- Tab 1: "Season Stats" (existing content, unchanged)
- Tab 2: "Game Stats" (new GameStatsView)
- The page title changes from "Season Statistics" to just "Statistics"
- The PageHero and PageBackground remain shared above the tabs

## Technical Details

- The game stats hook will use `Promise.all` to fetch tournaments and then batch-fetch match results for efficiency
- Player aggregation is done client-side since the data volume per game is manageable (bounded by tournament count)
- The hook uses `useQuery` with `["game-stats", gameName]` as the query key
- The overview query uses `["game-stats-overview"]` and fetches tournament counts grouped by game name
- No new database tables, migrations, or RLS policies required
- Reuses existing UI patterns (StatCard, charts, tables) from SeasonStats for visual consistency

