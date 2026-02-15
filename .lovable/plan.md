

# Unified Page Appearance Manager with Dynamic Page Support

## Overview
Combine the separate "Page Hero Images" and "Page Backgrounds" managers into a single "Page Appearance" card. Instead of hardcoding page lists, store the list of manageable pages in the database so admins can add new pages without code changes.

## Database Change

### New table: `managed_pages`
Stores which pages are available for appearance customization.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | default gen_random_uuid() |
| slug | text (unique, not null) | e.g. "dashboard" |
| label | text (not null) | e.g. "Dashboard" |
| supports_hero | boolean | default true |
| supports_background | boolean | default true |
| display_order | integer | default 0, for sorting |
| created_at | timestamptz | default now() |

Seed it with the current six pages (Dashboard, Tournaments hero-only, Leaderboard, Community, Achievements, Season Stats). RLS: public read, admin-only write.

Add a small "Add Page" form at the top of the manager so admins can register new pages (slug + label + checkboxes for hero/background support).

## UI Changes

### New: `src/components/admin/PageAppearanceManager.tsx`
- Fetches from `managed_pages` (ordered by `display_order`) instead of a hardcoded array
- For each page, renders a single collapsible row with two sub-sections:
  - **Hero Banner** (if `supports_hero`): image selector from media library or URL input, title, subtitle, Save button -- logic from HeroImageManager
  - **Background** (if `supports_background`): URL input, Upload, Generate AI, opacity slider, Save, Clear -- logic from BackgroundManager
- Includes a small inline form to add a new managed page (slug, label, hero/background toggles) and a delete button per page
- Uses existing hooks: `useAllPageHeroes`, `useUpsertPageHero`, `useAllPageBackgrounds`, `useUpsertPageBackground`, `useDeletePageBackground`, `useMediaLibrary`
- New hook `useManagedPages` for CRUD on the `managed_pages` table

### New: `src/hooks/useManagedPages.ts`
- `useAllManagedPages()` -- fetches all rows ordered by `display_order`
- `useAddManagedPage()` -- inserts a new page
- `useDeleteManagedPage()` -- removes a page (and optionally its hero/background records)

### Modified: `src/pages/admin/AdminMedia.tsx`
- Replace `<HeroImageManager />` and `<BackgroundManager />` with `<PageAppearanceManager />`

### Removed (unused after merge):
- `src/components/admin/HeroImageManager.tsx`
- `src/components/admin/BackgroundManager.tsx`

## Technical Details

- The `managed_pages` table is the single source of truth for which pages can be customized, making it trivial to add future pages
- Collapsible rows (using Radix Collapsible) keep the UI compact when managing many pages
- All existing hero/background data and hooks remain unchanged -- only the UI layer is consolidated
- No changes to `PageHero.tsx`, `PageBackground.tsx`, or their hooks

