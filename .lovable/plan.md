

## Plan: Link Game Selector to Games Catalog + Add Promo Generation for Servers

### Problem
The Game Servers "Add/Edit Server" dialog currently uses a free-text input for the Game field. It should use a dropdown linked to the existing `games` catalog (same pattern as Tournaments, Challenges, and Quests). Additionally, admins should be able to generate promotional assets for servers.

### Database Change
Add a `game_id` column to `game_servers` that references the `games` table, allowing the server to inherit the game's cover image and name. Keep the existing `game` text column as a fallback display name.

```sql
ALTER TABLE public.game_servers ADD COLUMN game_id uuid REFERENCES public.games(id);
```

### Changes

**1. Migration: Add `game_id` FK to `game_servers`**
- Add nullable `game_id uuid` column referencing `games(id)`
- This lets servers link to the games catalog for cover images, names, and consistent data

**2. `src/hooks/useGameServers.ts`**
- Update `GameServer` type to include `game_id` and a joined `games` object (name, cover_image_url)
- Update queries to `.select("*, games(name, cover_image_url)")` so we get game data in one query
- Update `GameServerInput` to include `game_id`

**3. `src/pages/admin/AdminGameServers.tsx`**
- Replace the free-text Game `<Input>` with a `<Select>` dropdown populated from `useGames()` (same hook used by CreateTournamentDialog)
- When a game is selected, auto-populate the `game` text field and `game_id`
- Add a "Promo" button (Megaphone icon) per server row, using the existing `EventPromoEditorDialog` + a new `buildServerPromo()` helper
- The promo builder will use the server's image (or linked game cover) as background and overlay server name, game, IP:port

**4. `src/components/marketing/EventPromoEditor.tsx`**
- Add a `buildServerPromo(server)` function following the same pattern as `buildTournamentPromo` and `buildChallengePromo`
- Overlay: server name, game name, IP:port, description (if present)

**5. `src/pages/GameServers.tsx`**
- Use the joined `games.cover_image_url` as fallback when `image_url` is null on the server card

### Files

| File | Action |
|------|--------|
| Migration SQL | Add `game_id` column |
| `src/hooks/useGameServers.ts` | Add `game_id`, join games table |
| `src/pages/admin/AdminGameServers.tsx` | Game select dropdown + Promo button |
| `src/components/marketing/EventPromoEditor.tsx` | Add `buildServerPromo` |
| `src/pages/GameServers.tsx` | Use game cover as fallback image |

