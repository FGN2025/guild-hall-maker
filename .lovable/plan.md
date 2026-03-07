

# Game-Specific Seasons with Flexible Duration

## Problem
Seasons are currently global (one active season for the entire platform) with an assumed monthly cadence. The user needs seasons tied to specific games, with independent durations, connected to both tournaments and challenges.

## Scope of Change
This is a significant architectural shift. The current system has a single "active" season that all tournaments/challenges/points feed into. Moving to per-game seasons touches the database schema, multiple edge functions, and many frontend hooks/pages.

## Database Changes

### 1. Add `game_id` column to `seasons`
```sql
ALTER TABLE public.seasons ADD COLUMN game_id uuid REFERENCES public.games(id) ON DELETE SET NULL;
```
This makes seasons optionally game-specific. A `NULL` game_id could represent a "global" season (backward compatible), but going forward all new seasons will be tied to a game.

### 2. Add `season_id` to `challenges`
The challenges table already has a `game_id`. Add a `season_id` so challenges can be explicitly linked to a season:
```sql
ALTER TABLE public.challenges ADD COLUMN season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL;
```

### 3. Add `season_id` to `tournaments`
Tournaments currently link to seasons indirectly (the `award-season-points` function finds the single active season). Make it explicit:
```sql
ALTER TABLE public.tournaments ADD COLUMN season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL;
```

### 4. Update `season_scores` and `season_snapshots`
These already have `season_id` — no structural change needed. They'll naturally scope to per-game seasons since the season itself is now game-scoped.

## Edge Function Changes

### `award-season-points`
Currently finds the single "active" season. Must be updated to accept a `game` name (from the tournament), look up the active season for that game, and award points there.

### `rotate-season`
Currently rotates one global season. Must be updated to accept an optional `game_id` or rotate all expired game seasons. Each game season rotates independently based on its own end date.

## Frontend Changes

### `AdminSeasons.tsx`
- Add a game selector (dropdown of active games) to the create season dialog
- Display game name/badge on each season card
- Add filter by game
- Allow different durations per game (already date-based, just remove the monthly assumption)

### `useSeasonalLeaderboard.ts` / `useSeasonStats.ts`
- Add game filter parameter so leaderboards can show per-game season standings
- Update `useSeasons` to optionally filter by game_id

### `SeasonStats.tsx`
- Add game filter alongside season selector
- When a game is selected, only show seasons for that game

### `award-season-points` callers (bracket match scoring in `BracketMatchCard`)
- Pass the tournament's game name so the edge function can find the right game season

### `ModeratorPoints.tsx`
- Currently fetches single active season. Must allow selecting which game season to adjust points for.

### `PrizeShop.tsx`
- Currently reads points from the single active season. May need to aggregate across game seasons or let user pick which game season's points to spend.

### `useMyStats.ts` / `usePlayerComparison.ts`
- Update to handle multiple active seasons (one per game) instead of assuming one

## Migration Strategy
- Add columns as nullable so existing data continues to work
- Existing seasons with `game_id = NULL` are treated as "legacy/global"
- New seasons require a game selection
- The rotate function handles both legacy and game-specific seasons

## Files to Modify

| File | Change |
|---|---|
| **Migration SQL** | Add `game_id` to seasons, `season_id` to tournaments and challenges |
| `supabase/functions/award-season-points/index.ts` | Accept game name, find game-specific active season |
| `supabase/functions/rotate-season/index.ts` | Rotate per-game seasons independently |
| `src/pages/admin/AdminSeasons.tsx` | Game selector in create dialog, game badge on cards, filter |
| `src/hooks/useSeasonalLeaderboard.ts` | Add game_id filter to season queries |
| `src/hooks/useSeasonStats.ts` | Add game_id filter |
| `src/pages/SeasonStats.tsx` | Add game filter UI |
| `src/pages/moderator/ModeratorPoints.tsx` | Game-aware season selection |
| `src/pages/PrizeShop.tsx` | Handle multiple active game seasons |
| `src/hooks/useMyStats.ts` | Handle per-game seasons |
| `src/components/tournaments/BracketMatchCard.tsx` | Pass game to award-season-points |
| `src/components/tournaments/CreateTournamentDialog.tsx` | Optional season_id picker |

