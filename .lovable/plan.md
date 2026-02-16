

## Add Counter-Strike 2, League of Legends, and World of Tanks

### Games to Add

Three new entries in the `games` table starting at `display_order` 26:

| Game | Slug | Category | Platforms | Order |
|------|------|----------|-----------|-------|
| Counter-Strike 2 | counter-strike-2 | Shooter | PC | 26 |
| League of Legends | league-of-legends | Strategy | PC | 27 |
| World of Tanks | world-of-tanks | Strategy | PC, PS5, Xbox | 28 |

### Steps

1. **Generate cover images** for all three games using the AI image generator and save them as project assets.

2. **Upload cover images** to the `app-media` storage bucket under `games/` (e.g., `games/counter-strike-2-cover.jpg`).

3. **Insert database records** for each game with:
   - Name, slug, category, platform tags, cover image URL
   - A short description
   - A markdown user guide (controls, tips, strategy) matching the format of existing games

4. **Verify** the three new games appear on the `/games` page and that any tournaments referencing these game names will pick up the cover art on tournament cards.

### Technical Details

- No schema or code changes needed -- just new data rows and assets
- The existing `useGames` hook will automatically pick up the new active games
- Tournament card fallback logic already maps `game` name to `cover_image_url`
