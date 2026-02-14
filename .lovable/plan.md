

# Add YouTube Video Management to Media Library

## Overview
Move the Featured Video URL management into the Admin Media Library page so admins can manage all media (images, video, audio, and the embedded YouTube video) from one place.

## Changes

### Modify `src/pages/admin/AdminMedia.tsx`
Add a "Featured Video" card at the top of the media library page (above the uploader). This card will:
- Fetch the `featured_video_url` from `app_settings` on mount
- Show a YouTube preview embed (small 16:9 thumbnail) of the current video
- Provide an input field to update the URL
- Include a Save button using the same pattern as AdminSettings

The card will sit in a distinct section with a heading like "Featured Video" and a brief description ("YouTube video shown on the home page. Paste a youtu.be or youtube.com link.").

### No other file changes needed
- The `app_settings` row already exists
- The Admin Settings page keeps its copy of the field (no harm in having it in both places)
- No database or edge function changes required

## Technical Details

### Files changed

| Action | File |
|--------|------|
| Modify | `src/pages/admin/AdminMedia.tsx` -- add Featured Video management card with URL input, preview, and save |

### Implementation approach
- Reuse the `extractYouTubeId` helper from `FeaturedVideo.tsx` (or inline it)
- Use `useState` + `useEffect` to fetch the current URL from `app_settings` on mount
- Save via `supabase.from("app_settings").update({ value }).eq("key", "featured_video_url")`
- Show a small AspectRatio 16:9 iframe preview of the current video when a valid URL is set
- Use `sonner` toast for save feedback, matching existing patterns in the media page

