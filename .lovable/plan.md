

# Games Library / Catalog Feature

## Overview
Add a full Games Library to the platform where admins can manage hundreds of games (with descriptions, categories, cover images, and user guides), and all users can browse, search, and filter them. Each game gets its own detail page showing its info, guide, and any related tournaments. This mirrors the reference design from Fiber Gaming Network while staying consistent with the existing app's dark theme and branding.

## Database Changes

### New table: `games`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | default gen_random_uuid() |
| name | text | required, unique |
| slug | text | required, unique (URL-friendly) |
| description | text | nullable |
| category | text | default 'General' (e.g. Fighting, Shooter, Sports, Party, Racing, Strategy) |
| cover_image_url | text | nullable |
| guide_content | text | nullable, markdown/plain text for the user guide |
| platform_tags | text[] | e.g. ['PC', 'PS5', 'Xbox'] |
| is_active | boolean | default true |
| display_order | integer | default 0 |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### RLS Policies
- **SELECT**: anyone can read active games (`true` or `is_active = true`)
- **ALL (admin)**: admins can create/update/delete games via `has_role(auth.uid(), 'admin'::app_role)`

### Tournament linking
The existing `tournaments.game` column stores a free-text game name. Rather than a breaking migration, tournaments will be linked by matching `tournaments.game` to `games.name`, allowing the game detail page to show related tournaments without altering the tournaments table.

## New Pages and Components

### 1. Games List Page (`src/pages/Games.tsx`)
- Grid of game cover-image cards (similar to the reference screenshots)
- Left sidebar panel with:
  - Search input (filters by name)
  - Category dropdown (All, Fighting, Shooter, Sports, Party, Racing, Strategy, etc.)
  - "Has Tournaments" checkbox toggle to show only games with active tournaments
- Clicking a card navigates to `/games/:slug`

### 2. Game Detail Page (`src/pages/GameDetail.tsx`)
- Back link to "/games"
- Large cover image on the left, name + category badge + description on the right
- "User Guide" section below (rendered from `guide_content`)
- "Tournaments" section listing any tournaments where `tournaments.game` matches this game's name

### 3. Admin Games Management Page (`src/pages/admin/AdminGames.tsx`)
- Table of all games with edit/delete actions
- "Add Game" dialog with form fields: name, slug (auto-generated from name), category, description, cover image upload, guide content, platform tags
- Edit dialog for updating existing games
- Accessible from admin sidebar

### 4. Supporting Components
- `src/components/games/GameCard.tsx` -- cover image card with hover effect and game name overlay
- `src/components/games/AddGameDialog.tsx` -- dialog for creating/editing a game
- `src/hooks/useGames.ts` -- queries and mutations for the games table

## Routing Changes (`src/App.tsx`)
- `/games` -- Games list (inside authenticated AppLayout)
- `/games/:slug` -- Game detail (inside authenticated AppLayout)
- `/admin/games` -- Admin games management

## Navigation Changes
- Add "Games" nav item to `Navbar.tsx` (with Gamepad2 icon, between Tournaments and Dashboard)
- Add "Games" link to `AdminSidebar.tsx`

## Technical Details
- Cover images uploaded to the existing `app-media` storage bucket under a `games/` prefix
- The guide_content field stores plain text or markdown; rendered with basic formatting on the detail page
- Search and category filtering done client-side for simplicity (works fine for hundreds of games)
- Slug auto-generated from name (lowercase, hyphens) with manual override option
- Consistent styling: `glass-panel`, `font-display`, `font-heading`, `bg-card`, `border-border` classes throughout

