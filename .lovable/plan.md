
# Add File Upload to Page Backgrounds Manager

## Overview
Add a file upload button to each page row in the BackgroundManager, so admins can upload an image file directly from their computer in addition to pasting a URL or generating with AI.

## Changes

### Modified: `src/components/admin/BackgroundManager.tsx`

- Add an **"Upload"** button (with an Upload icon) next to the "Generate AI" and "Save" buttons for each page row
- Include a hidden `<input type="file" accept="image/*">` per row, triggered by the Upload button click
- On file selection:
  1. Upload the file to the `app-media` storage bucket under the `banner/` path (reusing the same pattern from `useMediaLibrary`)
  2. Get the public URL
  3. Set that URL into the page row's `image_url` field
  4. Show a success toast prompting the admin to click Save
- Add uploading state tracking per slug to disable the button and show a spinner during upload
- Import the `Upload` icon from lucide-react

No database or schema changes needed -- the existing `app-media` bucket and `page_backgrounds` table already support this workflow.
