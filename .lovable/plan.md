

# Sync Game and Tournament Images into the Admin Media Library

## Problem
There are 46 games in the database, but only 25 have entries in the `media_library` table. The remaining 21 game cover images exist in storage (`app-media/games/...`) and are referenced by `cover_image_url` in the `games` table, but were never registered as media library records. Additionally, tournaments have an `image_url` column but none have images assigned yet.

## Solution

### 1. Add a "Sync Missing Images" button on the Admin Media page

**File: `src/pages/admin/AdminMedia.tsx`**
- Add a "Sync Game Images" button (with a RefreshCw icon) near the top header area
- When clicked, it queries all games that have a `cover_image_url` but no matching `media_library` entry
- For each missing game, it inserts a new `media_library` row with:
  - `file_name`: derived from the URL path (e.g., `elden-ring-cover.jpg`)
  - `file_path`: extracted storage path (e.g., `games/elden-ring-cover.jpg`)
  - `url`: the full public URL from `cover_image_url`
  - `category`: `"games"`
  - `tags`: `["game-cover", gameName]`
- Shows a toast with how many images were synced
- This is a one-time catch-up for the 21 missing entries

### 2. Add tournament image support to the Media Library

**File: `src/components/tournaments/CreateTournamentDialog.tsx`**
- After uploading a tournament image to storage, also register it in the `media_library` table with `category: "tournament"` and `tags: ["tournament-hero"]` (same pattern already used in `AddGameDialog`)

**File: `src/components/tournaments/EditTournamentDialog.tsx`**
- Apply the same media_library registration logic for tournament image uploads

### 3. Ensure future game images stay in sync (already done)
The `AddGameDialog` already registers uploads in `media_library` (lines 57-75). No changes needed there.

## Technical Details

### Sync function logic (AdminMedia.tsx)

```text
1. Fetch all games with cover_image_url IS NOT NULL
2. Fetch all media_library entries with category = 'games'
3. Find games whose cover_image_url is not in the media_library URLs
4. For each missing game:
   - Extract file_name from URL path
   - Extract file_path (strip the storage base URL prefix)
   - Insert into media_library
5. Invalidate the media-library query cache
6. Show success toast: "Synced X game images to media library"
```

### URL-to-path extraction

Game cover URLs follow the pattern:
`https://.../storage/v1/object/public/app-media/games%2Ffilename.jpg`

The extraction will decode the URL and strip the base to get `games/filename.jpg`.

### No database schema changes needed
Both `media_library` and `tournaments.image_url` columns already exist.

