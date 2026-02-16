

## Add Mortal Kombat 1 to Games Catalog

### Problem
The "Winter Showdown" tournament references "Mortal Kombat 1" but no matching entry exists in the games catalog, so the tournament card falls back to a gradient instead of showing cover art.

### Steps

1. **Find a cover image** -- There is no Mortal Kombat 1 image in the project assets or storage bucket. Two options:
   - Upload a cover image file to the `app-media` storage bucket under `games/mortal-kombat-1-cover.jpg`
   - Use a public URL for the cover art

2. **Insert the game record** into the `games` table with:
   - `name`: "Mortal Kombat 1" (must match the tournament's `game` field exactly)
   - `slug`: "mortal-kombat-1"
   - `category`: "Fighting"
   - `platform_tags`: ["PC", "PS5", "Xbox"]
   - `display_order`: 25
   - `is_active`: true
   - `cover_image_url`: the uploaded/provided image URL
   - `description` and `guide_content`: filled in with relevant content (controls, tips, strategy) matching the format of other games

3. **Verify** -- Navigate to `/tournaments` and confirm the Winter Showdown card now shows the Mortal Kombat 1 cover image instead of the gradient fallback.

### Note
Since there is no Mortal Kombat 1 cover image in the project, I will search for a suitable public image to use as the cover. If you have a preferred image you'd like to upload, let me know.

