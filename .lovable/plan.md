

# Fix: Delete Dialog Triggering Image Preview

## Problem

The delete button (trash icon) sits inside the hover overlay `div`, which itself is inside the clickable image container (line 126). When clicking the trash icon:

1. The `AlertDialog` opens (correct)
2. The click also bubbles up to the parent `div` on line 124-126, which calls `openPreview(item)` — opening the image preview dialog too

The copy button on line 144 has the same issue — no `e.stopPropagation()`.

## Fix

**File**: `src/components/media/MediaGrid.tsx`

Two changes:

1. **Add `e.stopPropagation()` to the hover overlay `div`** (line 139) — this prevents any click inside the overlay (copy, delete) from bubbling up to the parent container that triggers the image preview.

2. **Add `e.stopPropagation()` to the copy button click handler** (line 144) as a safeguard.

This is a single-file, two-line fix. No backend changes needed.

