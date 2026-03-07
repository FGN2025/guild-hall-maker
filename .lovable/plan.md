

# Fix Embed Widget Save + Add Thumbnail Upload

## Problem
The `media_library` table has a CHECK constraint (`media_library_file_type_check`) that only allows `image`, `video`, `audio`. Saving with `file_type: "embed"` is rejected.

## Changes

### 1. Database Migration
Drop and recreate the check constraint to include `embed`:
```sql
ALTER TABLE public.media_library DROP CONSTRAINT media_library_file_type_check;
ALTER TABLE public.media_library ADD CONSTRAINT media_library_file_type_check
  CHECK (file_type = ANY (ARRAY['image','video','audio','embed']));
```

### 2. AddEmbedDialog — Add Thumbnail File Upload
Update `AddEmbedDialog.tsx` to allow uploading a thumbnail file as an alternative to pasting a URL:
- Add a file input (accept images only) alongside the existing URL input
- When a file is selected, upload it to `app-media` storage bucket under `widget/` prefix, then use the resulting public URL as the thumbnail
- Show a small preview of the selected/uploaded thumbnail
- The URL input and file upload are mutually exclusive — picking one clears the other

| File | Change |
|---|---|
| Migration | Add `embed` to `file_type` check constraint |
| `src/components/media/AddEmbedDialog.tsx` | Add thumbnail file upload option alongside URL input |

