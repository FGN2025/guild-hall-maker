

# Add Page Hero Images with Admin Management

## Overview
Create a system where admins can assign hero images to any page in the app, managed from the Admin Media page. A reusable `PageHero` component will display the assigned image at the top of each page.

## Database

### New table: `page_hero_images`
Stores the mapping between a page identifier (slug) and its hero image.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| page_slug | text | Unique, e.g. "dashboard", "tournaments", "leaderboard" |
| image_url | text | URL from media library / storage |
| title | text (nullable) | Optional overlay title |
| subtitle | text (nullable) | Optional overlay subtitle |
| updated_at | timestamptz | Auto-updated |
| created_at | timestamptz | Default now() |

### RLS Policies
- **SELECT**: Anyone can read (heroes are public UI)
- **ALL** (insert/update/delete): Admin-only via `has_role(auth.uid(), 'admin')`

## New Component: `PageHero`

A reusable component (`src/components/PageHero.tsx`) that:
- Accepts a `pageSlug` prop (e.g. `"tournaments"`)
- Fetches the hero image from `page_hero_images` for that slug
- Renders a banner with the image, gradient overlay, and optional title/subtitle
- Gracefully renders nothing if no hero image is assigned
- Caches data with React Query

## Page Integration

Add `<PageHero pageSlug="..." />` to the top of these pages:
- **Dashboard** (`pageSlug="dashboard"`)
- **Tournaments** (`pageSlug="tournaments"`)
- **Leaderboard** (`pageSlug="leaderboard"`)
- **Community** (`pageSlug="community"`)
- **Achievements** (`pageSlug="achievements"`)
- **Season Stats** (`pageSlug="season-stats"`)

Each page will show its hero banner above the existing content if an image is assigned.

## Admin Management UI

Add a new "Page Hero Images" card to `AdminMedia.tsx` (between the Featured Video card and the uploader), containing:
- A list of all assignable pages with their current hero image preview
- For each page: a media picker (select from existing media library items or paste a URL), plus optional title/subtitle fields
- Save button per page that upserts into `page_hero_images`

The list of assignable pages will be defined as a constant array so new pages can easily be added later.

## Technical Details

| Action | File | Detail |
|--------|------|--------|
| Migration | `supabase/migrations/...` | Create `page_hero_images` table with RLS policies |
| Create | `src/hooks/usePageHero.ts` | Hook to fetch hero image by slug + admin hook for managing all heroes |
| Create | `src/components/PageHero.tsx` | Reusable hero banner component |
| Create | `src/components/admin/HeroImageManager.tsx` | Admin card for assigning hero images to pages |
| Modify | `src/pages/admin/AdminMedia.tsx` | Add the HeroImageManager card |
| Modify | `src/pages/Dashboard.tsx` | Add `<PageHero>` |
| Modify | `src/pages/Tournaments.tsx` | Add `<PageHero>` |
| Modify | `src/pages/Leaderboard.tsx` | Add `<PageHero>` |
| Modify | `src/pages/Community.tsx` | Add `<PageHero>` |
| Modify | `src/pages/Achievements.tsx` | Add `<PageHero>` |
| Modify | `src/pages/SeasonStats.tsx` | Add `<PageHero>` |

