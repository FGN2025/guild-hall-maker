

## Game Dropdown for Tournament Creation & Game Cover as Default Card Image

### Problem
The game field in tournament creation/edit is a free-text input. This leads to typos and mismatches with the games catalog. Additionally, the tournament card should automatically use the game's cover image as the default hero when no custom image is uploaded.

### Current State
- The `games` table has `name`, `cover_image_url`, and `is_active` fields
- `useGames()` hook already fetches active games sorted by display order
- `useTournaments` already resolves `game_cover_url` by matching `t.game` to the games table `name` field — so the card fallback already works
- `TournamentCard` already renders `t.image_url || t.game_cover_url` — this is already correct
- The issue is purely in the **creation/edit forms**: the game field is a free-text `<Input>` instead of a `<Select>` dropdown

### Plan

#### 1. `src/components/tournaments/CreateTournamentDialog.tsx`
- Import `useGames` from `@/hooks/useGames`
- Call `const { data: games = [] } = useGames()` to fetch active games
- Replace the game `<Input>` with a `<Select>` dropdown populated from the games list
- Each `<SelectItem>` shows the game name; the value is the game name (since `tournaments.game` stores the name string, not an ID)
- No schema changes needed — the `game` column stays as text matching the game name

#### 2. `src/components/tournaments/EditTournamentDialog.tsx`
- Same change: import `useGames`, replace game `<Input>` with `<Select>` dropdown
- Pre-select the current `tournament.game` value

#### 3. Admin & Moderator tournament forms
- `src/pages/admin/AdminTournaments.tsx` and `src/pages/moderator/ModeratorTournaments.tsx` — check if they have inline game editing fields that also need the dropdown treatment

No database changes required. The card image fallback (`image_url || game_cover_url`) is already implemented everywhere.

