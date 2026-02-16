

## Add New Games to the Catalog

Minecraft is already in the catalog, so we'll add the 3 new titles:

| # | Name | Slug | Category | Platform Tags | Display Order |
|---|------|------|----------|---------------|---------------|
| 1 | Super Smash Brothers | super-smash-brothers | Fighting | Switch | 22 |
| 2 | ARC Raiders | arc-raiders | Shooter | PC, PS5, Xbox | 23 |
| 3 | BeamNG.drive | beamng-drive | Racing | PC | 24 |

### Steps

1. **Generate cover art** for each of the 3 games using AI image generation (cyberpunk/gaming style, 3:4 aspect ratio)
2. **Upload cover images** to cloud storage (`app-media` bucket, `games/` path)
3. **Insert game records** into the `games` table with proper metadata (name, slug, category, description, platform tags, cover image URL, display_order 22-24, is_active: true)
4. **Verify** the updated grid at `/games` shows all 25 games correctly

### Notes

- Minecraft already exists (display_order 18) -- no action needed for it
- Each game gets a short description summarizing the gameplay
- Cover images will be stored at `games/{slug}-cover.png` in the storage bucket

