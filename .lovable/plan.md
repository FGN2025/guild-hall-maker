

# Fix: Bulk Delete Not Working as Expected

## Problem

When items are selected via checkboxes, the individual trash icon on each card still performs a single-item delete. The sticky "Delete Selected" action bar appears at the top of the grid, but the user is instead clicking the per-card trash icon, which only deletes that one image.

## Solution

Two changes to `src/components/media/MediaGrid.tsx`:

1. **Hide individual action overlay when in selection mode** -- When `selectedIds.size > 0`, suppress the hover overlay (copy/trash buttons) so the entire card acts as a selection toggle. This prevents confusion between single-delete and bulk-delete.

2. **Make the bulk action bar more prominent** -- Add stronger visual styling (larger text, more contrast) so the "Delete Selected" bar at the top is unmissable.

This ensures that once the user starts selecting, the only delete path is the bulk "Delete Selected" button in the action bar. Clicking any card in selection mode simply toggles its checkbox.

Single-file change, no backend modifications.

