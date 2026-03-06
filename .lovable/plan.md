

# Plan: Add Category Editing to Media Library

## Problem
The uploader already has a category selector, but there's no way to **change** a media item's category after upload. The "games" category is also missing from the uploader's category list (it exists as a tab filter but can't be selected during upload).

## Changes

### 1. Fix missing "games" category in uploader
**File**: `src/components/media/MediaUploader.tsx`
- Add `"games"` to the `CATEGORIES` array so it matches the tab filters.

### 2. Add inline category editing to MediaGrid
**File**: `src/components/media/MediaGrid.tsx`
- Add a category dropdown (Select) to each media card's hover overlay or footer area, allowing admins to change the category directly from the grid.
- On change, call a new `onUpdateCategory` callback prop.

### 3. Add update mutation to useMediaLibrary hook
**File**: `src/hooks/useMediaLibrary.ts`
- Add an `updateCategory` mutation that runs `supabase.from("media_library").update({ category }).eq("id", itemId)` and invalidates the query cache.
- Expose it in the return object.

### 4. Wire it up in AdminMedia and MediaLibrary pages
**Files**: `src/pages/admin/AdminMedia.tsx`, `src/pages/MediaLibrary.tsx`
- Pass the new `onUpdateCategory` handler from the hook into `MediaGrid`.

