
# Add Tag Input to Media Uploader

## Overview
Add a tag input field to the MediaUploader component so admins can type custom tags before uploading files. Tags will be passed through to the existing upload pipeline, which already supports a `tags` array but never populates it from the UI.

## How It Works
- A text input appears next to the category dropdown
- Admins type a tag and press Enter (or comma) to add it as a chip/badge
- Each tag chip has an X button to remove it
- When files are uploaded, the current tags array is included in the `onUpload` call
- Tags reset after upload completes

## Changes

### Modified: `src/components/media/MediaUploader.tsx`
- Add `tags` state (`string[]`) and a `tagInput` state (`string`)
- Add an `Input` field with `onKeyDown` handler that listens for Enter/comma to push the current input into the tags array
- Render tags as Badge components with an X button to remove
- Pass `tags` into the `onUpload` call alongside `category`
- Clear tags after files are handled

### No other changes needed
The `useMediaLibrary` hook already accepts and stores `tags` in the database. The `MediaGrid` search already filters by tags. This is purely a UI addition to the uploader component.

## Technical Details
- Tags are trimmed, deduplicated, and limited to 10 per upload to prevent abuse
- Empty strings are filtered out
- Uses existing `Input` component for the text field and `Badge` component for tag chips
- The `X` (lucide) icon import already exists in the file
