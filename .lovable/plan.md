

## Add Media Library Picker to Marketing Asset Upload

### Overview
Enhance the `CampaignAssetsDialog` in the Admin Marketing page so that when uploading assets to a campaign, the admin can choose between two sources:
1. **Local machine** (existing file input -- works today)
2. **Media Library** (pick an existing image from the app's centralized media library)

This reuses the existing `MediaPickerDialog` component, which already provides category tabs, search, and image selection.

### Changes

#### 1. Update `CampaignAssetsDialog` in `src/pages/admin/AdminMarketing.tsx`

- Import `MediaPickerDialog` from `@/components/media/MediaPickerDialog`
- Add a state variable `mediaPickerOpen` to control the picker dialog
- Add a new "Library" button next to the existing "Upload" button
- When a media library image is selected (returns a URL), create a new `marketing_assets` row directly with that URL and file path (no re-upload needed since the image is already in storage)

The upload area will have two buttons side by side:
- **Upload** -- opens the file picker from local machine (existing behavior)
- **Library** -- opens the `MediaPickerDialog` to browse the app media library

#### 2. Update `useMarketingAssets` hook in `src/hooks/useMarketingCampaigns.ts`

- Add a new `addAssetFromUrl` mutation that inserts a `marketing_assets` row using a URL and file_path directly (no storage upload needed since the file already exists in the media library bucket)

### UI Layout (Asset Dialog)

```text
+------------------------------------------+
| Rocket League -- Assets                   |
+------------------------------------------+
| Label: [Square v]                        |
|                                          |
| [ Upload from Device ] [ Media Library ] |
|                                          |
| [asset grid...]                          |
+------------------------------------------+
```

### Technical Details

- `MediaPickerDialog.onSelect` returns a URL string; we also need the file_path for the `marketing_assets` record
- We'll update the `MediaPickerDialog` callback to return both `url` and `file_path` (or modify the `addAssetFromUrl` mutation to accept just a URL and derive file_path from it)
- Since both the media library and marketing assets use the same `app-media` bucket, we can reference the same storage path -- no file duplication needed

### Files to modify

| File | Change |
|------|--------|
| `src/pages/admin/AdminMarketing.tsx` | Add Library button + MediaPickerDialog integration in `CampaignAssetsDialog` |
| `src/hooks/useMarketingCampaigns.ts` | Add `addAssetFromUrl` mutation to `useMarketingAssets` |
| `src/components/media/MediaPickerDialog.tsx` | Extend `onSelect` to pass both URL and file_path (or add an alternate callback prop) |

