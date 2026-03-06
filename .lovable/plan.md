

# Plan: Add Image Preview Dialog to Media Grid

## Change

**File**: `src/components/media/MediaGrid.tsx`

- Add a state variable to track which media item is selected for preview
- Add a `Dialog` component that displays the full image when an item is clicked
- The dialog will show the image at full size with its filename as the title
- Clicking the image thumbnail (not the hover overlay buttons) will open the preview dialog

This is a single-file UI change with no backend modifications needed.

