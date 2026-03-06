

# Plan: Add Bulk Delete to Media Library

## Overview
Add checkbox selection to media grid items with a bulk delete action bar that appears when items are selected.

## Changes

### 1. `src/components/media/MediaGrid.tsx`
- Add `selectedIds` state (`Set<string>`) to track selected items
- Add a `Checkbox` overlay on each card (top-left corner, always visible when in selection mode or on hover)
- Clicking the checkbox toggles selection (with `e.stopPropagation()` to avoid triggering preview)
- When `selectedIds.size > 0`, render a sticky action bar above the grid with:
  - "{N} selected" label
  - "Select All" / "Deselect All" toggle button
  - "Delete Selected" button wrapped in `AlertDialog` for confirmation
- Add `onBulkDelete` prop to handle deleting multiple items

### 2. `src/hooks/useMediaLibrary.ts`
- Add `bulkDeleteMutation` that loops through items, deletes storage files and DB records
- Expose `bulkDelete` and `isBulkDeleting` from the hook

### 3. `src/pages/admin/AdminMedia.tsx`
- Pass `onBulkDelete` and `isBulkDeleting` props to `MediaGrid`

