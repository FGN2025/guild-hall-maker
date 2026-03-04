

# Auto-Resize Logo Uploads

## Problem
Logo uploads currently reject images that exceed size/dimension limits (e.g., "Width 1310px exceeds maximum 1024px"). Instead, logos should be automatically resized and compressed to fit within the constraints.

## Solution
Create a client-side image processing utility that uses Canvas API to resize and compress images before upload. Apply it to all three logo upload locations.

### New utility: `src/lib/imageResize.ts`
- Takes a `File` and target constraints (max width/height, max file size in KB, output format)
- Draws the image onto a `<canvas>`, scaling down proportionally if it exceeds max dimensions
- Exports as WebP (or JPEG fallback) with quality reduction loop until file size is under the limit
- Returns a new `File` object ready for upload

### Changes to upload flows

1. **`src/pages/admin/AdminTenants.tsx`** — `LogoPicker.handleFile`: Replace `validateAndToast` rejection with `resizeImageFile()` call. Remove validation gate; auto-fit the image instead.

2. **`src/pages/tenant/TenantSettings.tsx`** — `handleLogoUpload`: Same pattern — replace the size/format rejection with auto-resize before upload.

3. **`src/components/admin/HeroLogoSettings.tsx`** — `handleUpload`: Apply auto-resize before uploading hero logo.

### Resize logic
```text
Input image (any size/format)
  → Load into Image element
  → Scale to fit within maxWidth × maxHeight (preserve aspect ratio)
  → Draw on canvas
  → Export as WebP at quality 0.9
  → If > maxSizeKB, reduce quality in steps of 0.05
  → Return resized File
```

Default constraints for logos: 512×512 max, 500KB max, WebP output.
For hero logos: 1920×1080 max, 800KB max, WebP output.

