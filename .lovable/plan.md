

# Admin-Manageable Featured YouTube Video on Home Page

## Overview
Add a YouTube video embed to the home page that admins can update from the existing Admin Settings page. The video URL is stored in the `app_settings` table (same pattern used for the "no providers" message).

## Step 1: Seed a New `app_settings` Row
Add a database migration to insert the default video URL into the existing `app_settings` table.

- **key**: `featured_video_url`
- **value**: `https://youtu.be/sBj4pCgMlt4`
- **description**: `YouTube video embedded on the home page`

No schema changes needed -- the table already exists with the right structure and RLS policies.

## Step 2: Create a `FeaturedVideo` Component
New file: `src/components/FeaturedVideo.tsx`

- On mount, fetch the `featured_video_url` value from `app_settings`
- Extract the YouTube video ID from the URL (handles `youtu.be/ID` and `youtube.com/watch?v=ID` formats)
- Render a responsive 16:9 YouTube iframe embed
- Wrap in a styled section with a heading like "Featured Video" to sit between the hero and featured tournaments

## Step 3: Add the Component to the Home Page
Modify `src/pages/Index.tsx` to render `<FeaturedVideo />` between `<HeroSection />` and `<FeaturedTournaments />`.

## Step 4: Add Video URL Field to Admin Settings
Modify `src/pages/admin/AdminSettings.tsx` to add a second settings card for "Featured Video URL" with a text input, using the same fetch/save pattern already in place for the no-providers message. Both settings will load on mount and save independently.

---

## Technical Details

### Database migration
```sql
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'featured_video_url',
  'https://youtu.be/sBj4pCgMlt4',
  'YouTube video embedded on the home page'
);
```

### YouTube ID extraction logic
```typescript
function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}
```

### Files changed

| Action | File |
|--------|------|
| Migration | Insert `featured_video_url` seed row |
| Create | `src/components/FeaturedVideo.tsx` -- fetches URL and renders YouTube embed |
| Modify | `src/pages/Index.tsx` -- add `<FeaturedVideo />` to the page |
| Modify | `src/pages/admin/AdminSettings.tsx` -- add video URL input field |

