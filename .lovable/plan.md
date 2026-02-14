

## App-Wide Media Management System with AI Image Generation

### Overview
Build a centralized media management system that serves the entire application -- not just tournaments. Admins can upload, organize, and AI-generate images for tournament cards, achievement badges, leaderboard trophies, community banners, and any other visual assets across all pages. Tournament cards will also get hero images displayed at the top.

### What Changes

**1. Storage and Database**
- Create a `app-media` storage bucket (public) for all application media
- Create a `media_library` table to track uploads with metadata:
  - `id`, `user_id`, `file_name`, `file_path`, `file_type` (image/video/audio), `mime_type`, `file_size`, `url`, `category` (tournament, badge, trophy, banner, general), `tags` (text array for searchability), `created_at`
- RLS: authenticated users can view all; uploaders can insert and delete their own

**2. AI Image Generation (via Lovable AI)**
- Create an edge function `generate-media-image` that calls the Lovable AI gateway using `google/gemini-2.5-flash-image` model
- Accepts a text prompt (e.g., "epic Street Fighter 6 tournament banner, dark cyberpunk style")
- Returns the generated image, which is automatically uploaded to the `app-media` bucket and saved to the `media_library` table
- Uses the existing `LOVABLE_API_KEY` secret -- no additional keys needed

**3. Tournament Card Hero Images**
- Update `TournamentCard.tsx` to render a hero image at the top of each card using the `image_url` field
- Show a game-themed gradient placeholder when no image is set
- Update `CreateTournamentDialog.tsx` to include an image upload or AI-generate option
- Update `TournamentManage.tsx` to allow changing the hero image

**4. Media Library Page (`/media`)**
- A new protected page accessible from the navbar
- Tabs/filters for media categories: All, Tournaments, Badges, Trophies, Banners, General
- Grid view showing thumbnails with file info
- Upload area supporting drag-and-drop for images, videos, and audio
- AI Generate button that opens a prompt dialog -- type a description and get an AI-generated image
- Delete and copy-URL actions on each media item
- Search by file name or tags

**5. Navigation**
- Add "Media" link with an Image icon to the navbar nav items
- Register `/media` route in `App.tsx` as a protected route

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/MediaLibrary.tsx` | Full media management page with grid, filters, upload, and AI generate |
| `src/hooks/useMediaLibrary.ts` | Hook for CRUD on `media_library` table + storage uploads |
| `src/components/media/MediaUploader.tsx` | Drag-and-drop upload component |
| `src/components/media/MediaGrid.tsx` | Filterable grid of media items with actions |
| `src/components/media/AIImageGenerator.tsx` | Dialog for entering a prompt and generating an image via AI |
| `supabase/functions/generate-media-image/index.ts` | Edge function calling Lovable AI for image generation, uploads result to storage |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/tournaments/TournamentCard.tsx` | Add hero image section at the top of each card |
| `src/components/tournaments/CreateTournamentDialog.tsx` | Add image upload field + AI generate option |
| `src/pages/TournamentManage.tsx` | Add hero image management section |
| `src/components/Navbar.tsx` | Add "Media" nav item |
| `src/App.tsx` | Add `/media` protected route |

### Technical Details

**Database migration:**
```text
-- Create app-media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('app-media', 'app-media', true);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'app-media');
CREATE POLICY "Anyone can view" ON storage.objects
  FOR SELECT USING (bucket_id = 'app-media');
CREATE POLICY "Uploaders can delete own files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'app-media' AND auth.uid()::text = owner_id::text);

-- Media library table
CREATE TABLE public.media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio')),
  mime_type TEXT,
  file_size BIGINT,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media" ON public.media_library FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON public.media_library FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own media" ON public.media_library FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

**Edge function `generate-media-image`:**
- Receives `{ prompt, category, tags }` in the request body
- Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `google/gemini-2.5-flash-image` model and `modalities: ["image", "text"]`
- Extracts the base64 image from the response
- Uploads it to `app-media` bucket via Supabase Storage API
- Inserts a record into `media_library`
- Returns the public URL and media record

**AI Generate UI flow:**
1. Admin clicks "AI Generate" button in the Media Library
2. A dialog appears with a text input for the prompt (e.g., "Cyberpunk Tekken 8 tournament badge")
3. Optional category and tags selection
4. Click "Generate" -- shows a loading spinner
5. Generated image appears as a preview; admin can "Save to Library" or "Regenerate"

**Tournament card layout change:**
```text
Before:                    After:
+-------------------+     +-------------------+
| status    format  |     | [HERO IMAGE]      |
| Title             |     | status    format  |
| Game              |     | Title             |
| Description       |     | Game              |
| Date|Players|Prize|     | Date|Players|Prize|
| [Buttons]         |     | [Buttons]         |
+-------------------+     +-------------------+
```

