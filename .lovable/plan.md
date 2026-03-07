

# Phase 1: Common Ninja Widget Library

## Goal
Allow Super Admins to save Common Ninja embed snippets as media library items (file_type: "embed", category: "widget") so tenants can browse and use them.

## Database Changes

**Migration: Add `embed_code` column to `media_library`**
```sql
ALTER TABLE public.media_library ADD COLUMN embed_code text;
```

No new RLS policies needed — existing `media_library` policies already allow admin insert/update and public read.

**Add "widget" to TABS arrays** (code-only, no migration).

## Code Changes

### 1. New Component: `AddEmbedDialog.tsx`
A dialog for Super Admins to paste a Common Ninja embed snippet. Fields:
- **Display Name** (text) — saved as `file_name`
- **Embed Code** (textarea) — saved to `embed_code`
- **Thumbnail URL** (optional text input) — saved as `url` for preview in the grid
- **Tags** (reuse tag input pattern from MediaUploader)

On submit, inserts into `media_library` with `file_type: "embed"`, `category: "widget"`, `file_path: "embed"`, and the embed HTML in `embed_code`.

### 2. Update `useMediaLibrary.ts`
- Add `embed_code` to the `MediaItem` interface (nullable string).

### 3. Update `AdminMedia.tsx`
- Add "widget" to `TABS` array.
- Add the `AddEmbedDialog` button next to the AI Image Generator button.

### 4. Update `MediaGrid.tsx`
- Add "widget" to `CATEGORIES` array.
- For items with `file_type === "embed"`, show an embed icon (Code2) instead of image thumbnail, and display the `file_name` as the label.

### 5. Update `MediaUploader.tsx`
- Add "widget" to `CATEGORIES` array.

### 6. Update `MediaPickerDialog.tsx`
- Add "widget" to `ALL_TABS`.
- For embed items, show the embed icon with file name (not an image thumbnail) so tenants can identify and select them.
- When an embed widget is selected, pass both the `url` and optionally the `embed_code` via `onSelect`.

| File | Change |
|---|---|
| Migration | Add `embed_code` text column to `media_library` |
| `src/hooks/useMediaLibrary.ts` | Add `embed_code` to `MediaItem` |
| `src/components/media/AddEmbedDialog.tsx` | New — admin dialog for pasting embed snippets |
| `src/pages/admin/AdminMedia.tsx` | Add "widget" tab, render AddEmbedDialog button |
| `src/components/media/MediaGrid.tsx` | Add "widget" category, embed item rendering |
| `src/components/media/MediaUploader.tsx` | Add "widget" to categories |
| `src/components/media/MediaPickerDialog.tsx` | Add "widget" tab, embed item display |

