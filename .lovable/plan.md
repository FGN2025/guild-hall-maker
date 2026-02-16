

## Add Eight More Multiplayer Games

Adding 8 new games to the catalog, including the 3 specified titles plus 5 more multiplayer games.

### Games to Add

| # | Name | Category | Platform Tags |
|---|------|----------|---------------|
| 1 | American Truck Simulator | Racing | PC |
| 2 | Farm Simulator 2025 | Strategy | PC, PS5, Xbox |
| 3 | Construction Simulator | Strategy | PC, PS5, Xbox |
| 4 | Fortnite | Shooter | PC, PS5, Xbox, Switch |
| 5 | Apex Legends | Shooter | PC, PS5, Xbox |
| 6 | Fall Guys | Party | PC, PS5, Xbox, Switch |
| 7 | Overwatch 2 | Shooter | PC, PS5, Xbox |
| 8 | Valorant | Shooter | PC |

### Steps

1. Generate cover art for each game (8 images, 3:4 aspect ratio) using AI image generation
2. Upload each image to cloud storage (app-media bucket, `games/` path)
3. Insert all 8 game records into the `games` table with proper metadata (name, slug, category, description, platform tags, cover image URL, display_order starting at 4)
4. Verify the full grid layout at `/games` with all 12 games

### Technical Details

- Each game gets a unique slug (e.g., `american-truck-simulator`, `farm-simulator-2025`)
- `display_order` values will be 4 through 11 (continuing from existing games)
- All games set to `is_active: true`
- Cover images uploaded to the existing `app-media` storage bucket under `games/`

