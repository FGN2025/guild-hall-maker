

## Plan: Fix Tournament Hero Images in Featured Events

### Problem
Tournaments store the game name as a plain text field (`game`), not a foreign key (`game_id`). So unlike challenges and quests, tournaments can't join to the `games` table to get a fallback cover image. When a tournament has no custom `image_url`, the card shows a text placeholder instead of an image.

### Solution — Single file change: `src/components/FeaturedEvents.tsx`

After fetching tournaments, do a secondary lookup against the `games` table to match by name and get cover images for any tournament missing its own `image_url`.

```typescript
// After fetching tourneys, get fallback images for those without image_url
const gamesWithoutImage = (tourneys ?? [])
  .filter((t: any) => !t.image_url)
  .map((t: any) => t.game);

let gameCovers: Record<string, string> = {};
if (gamesWithoutImage.length > 0) {
  const { data: gamesData } = await supabase
    .from("games")
    .select("name, cover_image_url")
    .in("name", gamesWithoutImage);
  (gamesData ?? []).forEach((g: any) => {
    if (g.cover_image_url) gameCovers[g.name] = g.cover_image_url;
  });
}
```

Then update the `imageUrl` mapping:
```typescript
imageUrl: t.image_url || gameCovers[t.game] || undefined,
```

No database changes needed.

