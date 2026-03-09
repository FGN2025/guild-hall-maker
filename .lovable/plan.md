

## Add Background Image Editing and Asset Variant Deletion

### Overview
Two features for the Tenant Marketing Detail page:
1. **Change Background Image** — Allow users to swap the background image in the Asset Editor and save as a new variant
2. **Delete Asset Variants** — Add a delete button to each asset variant card with confirmation

### Changes

#### 1. Add `setBaseImageUrl` to `useCanvasEditor` hook
**`src/hooks/useCanvasEditor.ts`**
- Expose a `setBaseImageUrl` function that loads a new image and updates the canvas base image, reusing the same logic as the initial `baseImageUrl` effect
- Add a `baseImageUrlRef` to track the current URL, and a `loadBaseImage(url)` callback that creates a new `Image`, sets `crossOrigin`, and updates `baseImage` + `canvasSize`

#### 2. Add "Change Background" button to Asset Editor
**`src/components/media/AssetEditorDialog.tsx`**
- Add a new toolbar button (e.g. `ImagePlus` icon with "Background" label) that opens a file picker or the MediaPickerDialog to select a replacement background image
- Wire the file upload to create an object URL and call `setBaseImageUrl`
- Wire the media library selection to call `setBaseImageUrl` with the selected URL
- Add a dedicated file input ref for background image uploads

#### 3. Add delete button to asset variant cards
**`src/pages/tenant/TenantMarketingDetail.tsx`**
- Import `Trash2` icon and the `deleteAsset` mutation from `useMarketingAssets`
- Add a `Trash2` button to each card's button row (with destructive styling)
- Wrap deletion in a `ConfirmDialog` to prevent accidental deletions
- Import and use the existing `ConfirmDialog` component

#### 4. Wire up delete for global assets
**`src/pages/tenant/TenantMarketingDetail.tsx`**
- Destructure `deleteAsset` from `useMarketingAssets(id)` (already available in the hook)
- The delete button calls `deleteAsset.mutate({ id: a.id, file_path: a.file_path })`

### Technical Details
- The `useCanvasEditor` hook currently receives `baseImageUrl` as a constructor param and loads it via a `useEffect`. Adding a `loadBaseImage` function exposes the same loading logic as a callable method.
- Asset deletion uses the existing `deleteAsset` mutation in `useMarketingAssets` which handles both storage file removal and database row deletion.
- The ConfirmDialog component already exists at `src/components/ConfirmDialog.tsx`.

