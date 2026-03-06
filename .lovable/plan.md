

# Fix: Bulk Delete Action Bar Not Visible

## Problem

The bulk action bar uses `sticky top-0`, but the media grid is nested inside the admin layout which has its own scrollable container. The `sticky` positioning only works relative to the nearest scroll ancestor. The bar sticks to the top of whatever scroll container wraps it, but the user has scrolled far down the page to select images — the bar is above the visible viewport or stuck at a position they can't see.

## Solution

**File**: `src/components/media/MediaGrid.tsx`

Move the bulk action bar from `sticky top-0` to `fixed` positioning so it floats visibly at the bottom of the screen regardless of scroll position. This is a common pattern (like Gmail's bulk action bar).

- Change the bar to `fixed bottom-4 left-1/2 -translate-x-1/2 z-50` with a solid background, rounded corners, and shadow
- This ensures the bar is always visible when items are selected, no matter where the user has scrolled
- Add `w-auto` / `max-w-xl` so it's a floating pill at the bottom center

Single-file, styling-only change.

