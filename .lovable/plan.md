

# Add Local File Upload and Media Library Picker to Challenge Cover Images

## Problem
Both `CreateChallengeDialog` and `EditChallengeDialog` only have a plain text input for cover image URL. The tournament dialogs already support local file upload and media library selection — the challenge dialogs should match.

## Approach
Replicate the exact pattern used in `CreateTournamentDialog` and `EditTournamentDialog`: a file upload button, a "Media Library" button that opens `MediaPickerDialog`, and a small image preview thumbnail.

## Changes

### `src/components/challenges/CreateChallengeDialog.tsx`
- Add state for `imageFile`, `imagePreview`, and `mediaPickerOpen`
- Replace the plain "Cover Image URL" text input with a row containing:
  - A file upload button (styled label with hidden file input, same as tournaments)
  - A "Media Library" button that opens `MediaPickerDialog`
  - A thumbnail preview when an image is selected
- On file upload: validate with `validateAndToast` + `useImageLimits`, set preview via `URL.createObjectURL`
- On media library select: clear file, set preview URL
- In the create mutation: if a local file is selected, upload it to the `media` storage bucket first, then use the resulting URL as `cover_image_url`; if media library was used, use the preview URL directly
- Add imports: `Upload`, `ImageIcon` (from lucide), `MediaPickerDialog`, `validateAndToast`, `useImageLimits`

### `src/components/challenges/EditChallengeDialog.tsx`
- Same pattern: add file upload + media library picker + preview, replacing the plain URL input
- On file upload: validate and preview; on save, upload to storage if a new file was selected
- Pre-populate the preview thumbnail from existing `cover_image_url` when editing
- Add same imports as above

No database or storage changes needed — the `media` bucket already exists and is used by the media library.

