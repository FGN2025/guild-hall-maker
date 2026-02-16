

## Adapt Game Cover Images to Tournament Cards

### Goal
When a tournament doesn't have its own `image_url`, fall back to the matching game's `cover_image_url` as the card hero image. This replaces the plain gradient placeholder with the actual game artwork.

### Current Behavior
- Tournament cards show `t.image_url` if set, otherwise a gradient with the game name text
- Games table has `cover_image_url` for every game
- Tournaments link to games by the `game` name string

### Implementation

**1. Update `useTournaments` hook** (`src/hooks/useTournaments.ts`)
- After fetching tournaments and registrations, also fetch games (`name`, `cover_image_url`) from the `games` table
- Enrich each tournament object with a new `game_cover_url` field by matching `t.game` to `game.name`
- Update the `Tournament` type to include `game_cover_url?: string | null`

**2. Update `TournamentCard` component** (`src/components/tournaments/TournamentCard.tsx`)
- In the hero image section (lines 43-51), use `t.image_url || t.game_cover_url` as the image source
- Keep the gradient fallback only when neither image is available

**3. Update `FeaturedTournaments` component** (`src/components/FeaturedTournaments.tsx`)
- This uses hardcoded static data, so no change needed (it doesn't use real tournament data)

### Technical Details

```text
Tournament Card Hero Logic:
  image_url set?        --> show tournament image
  game_cover_url set?   --> show game cover image
  neither?              --> show gradient fallback with game name
```

The hook change adds one extra lightweight query (just `name` and `cover_image_url` columns) and maps results in memory -- no schema changes needed.

