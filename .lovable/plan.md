

## Plan: Add Hero Images to Featured Event Cards

### Problem
The Featured Events cards on the homepage have no hero image — they're text-only. Each entity type already stores an image URL in the database that should be displayed.

### Image Fields Available
- **Tournaments**: `image_url` column (+ game cover fallback from `games` table via text match)
- **Challenges**: `cover_image_url` column (+ `games(cover_image_url)` via `game_id` FK)
- **Quests**: `cover_image_url` column (+ `games(cover_image_url)` via `game_id` FK)

### Changes — Single File: `src/components/FeaturedEvents.tsx`

1. **Add `imageUrl` to the `FeaturedEvent` interface**

2. **Update queries to fetch image fields**:
   - Tournaments: add `image_url` to select
   - Challenges: add `cover_image_url` and `games(name, cover_image_url)` to select
   - Quests: add `cover_image_url` and `games(name, cover_image_url)` to select
   - Use the entity's own image first, fall back to the game's cover image

3. **Add hero image section to each card** (matching the TournamentCard pattern):
   - Add a `relative h-36 bg-muted overflow-hidden rounded-t-xl` image container at the top of each card
   - Display the image with `object-cover` if available, or show a gradient placeholder with the game name
   - Overlay the type badge and status badge on top of the image
   - Remove padding from the card's outer wrapper top, add it only to the content below the image

No database changes needed.

