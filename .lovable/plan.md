

# Add Page Background Images with Admin Control and AI Generation

## Overview
Add full-page background images (like the home page's cyberpunk-themed background) to every page except Tournaments. Admins can assign and generate these backgrounds from the Admin Media panel using the existing AI image generation system.

## Database

### New table: `page_backgrounds`
Separate from the existing `page_hero_images` (which handles top-of-page banners).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| page_slug | text | Unique -- e.g. "dashboard", "community" |
| image_url | text | Background image URL |
| opacity | real | 0.0 to 1.0, controls visibility (default 0.15) |
| updated_at | timestamptz | Auto-updated |
| created_at | timestamptz | Default now() |

### RLS Policies
- **SELECT**: Public (backgrounds are visible to all users)
- **INSERT/UPDATE/DELETE**: Admin-only via `has_role(auth.uid(), 'admin')`

## New Components

### 1. `src/components/PageBackground.tsx`
A component that renders a fixed background image behind page content, similar to the home page's `HeroSection`:
- Accepts `pageSlug` prop
- Fetches background from `page_backgrounds` table
- Renders the image with configurable opacity plus a gradient overlay matching the dark cyberpunk theme
- Returns null gracefully if no background is set
- Placed inside each page's root `<div>` as an absolute-positioned layer

### 2. `src/components/admin/BackgroundManager.tsx`
Admin panel card for managing page backgrounds:
- Lists all assignable pages (Dashboard, Leaderboard, Community, Achievements, Season Stats -- excludes Tournaments)
- For each page: media library picker, URL input, and opacity slider
- "Generate with AI" button per page that uses the existing `generate-media-image` edge function with a pre-built prompt for cyberpunk gaming backgrounds
- Save button per page that upserts into `page_backgrounds`

## New Hook: `src/hooks/usePageBackground.ts`
- `usePageBackground(slug)` -- fetch a single page's background
- `useAllPageBackgrounds()` -- fetch all for admin view
- `useUpsertPageBackground()` -- mutation for saving

## Page Integration

Add `<PageBackground pageSlug="..." />` to these pages (NOT Tournaments):
- **Dashboard** (`pageSlug="dashboard"`)
- **Leaderboard** (`pageSlug="leaderboard"`)
- **Community** (`pageSlug="community"`)
- **Achievements** (`pageSlug="achievements"`)
- **Season Stats** (`pageSlug="season-stats"`)

Each page's root div will need `relative` positioning so the background layers correctly behind content.

## Admin Media Page Update

Add the `BackgroundManager` card to `src/pages/admin/AdminMedia.tsx` alongside the existing `HeroImageManager`.

## AI Generation Integration

The "Generate with AI" button in `BackgroundManager` will call the existing `generate-media-image` edge function with a themed prompt like:
> "Dark cyberpunk gaming background with neon cyan accents, abstract digital patterns, suitable for a [page name] page background"

The generated image is saved to the media library and its URL is automatically populated into the background assignment.

## Technical Details

| Action | File | Detail |
|--------|------|--------|
| Migration | `supabase/migrations/...` | Create `page_backgrounds` table with RLS |
| Create | `src/hooks/usePageBackground.ts` | Hooks for fetch and upsert |
| Create | `src/components/PageBackground.tsx` | Background image renderer |
| Create | `src/components/admin/BackgroundManager.tsx` | Admin card with media picker, AI generate, and opacity slider |
| Modify | `src/pages/admin/AdminMedia.tsx` | Add BackgroundManager card |
| Modify | `src/pages/Dashboard.tsx` | Add PageBackground + relative positioning |
| Modify | `src/pages/Leaderboard.tsx` | Add PageBackground + relative positioning |
| Modify | `src/pages/Community.tsx` | Add PageBackground + relative positioning |
| Modify | `src/pages/Achievements.tsx` | Add PageBackground + relative positioning |
| Modify | `src/pages/SeasonStats.tsx` | Add PageBackground + relative positioning |

