

## Fix: Media Library Not Showing All Assets for Background Selection

### Problem
Two issues:
1. The "Library" button in the Asset Editor opens the Media Picker configured for **overlay images** — it excludes "tournament", "games", and "challenges" categories, and the selected image gets added as an overlay (`addLogoFromUrl`) rather than replacing the background.
2. There is no way to select a background image from the Media Library. The `bgPickerOpen` state was created but never wired up — no second `MediaPickerDialog` instance exists for background selection.

### Solution

**File: `src/components/media/AssetEditorDialog.tsx`**

1. Add a second `MediaPickerDialog` instance wired to `bgPickerOpen` / `setBgPickerOpen`:
   - `onSelect` calls `setBaseImageUrl(url)` to replace the canvas background
   - No `excludeCategories` filter — show ALL media library assets so the user can pick any image as a background
2. Wire the existing "Background" button (or add a "From Library" option next to it) to open `setBgPickerOpen(true)` so users can choose a background from the library instead of only uploading a file.

### Result
- The "Library" button continues to work for adding overlay images (with category filtering)
- A new library-based background picker shows all assets and replaces the canvas background when selected

