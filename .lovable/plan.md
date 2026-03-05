

# Social Media Format Presets for Asset Editor

## Overview
Add a format selector to the Asset Editor that lets users choose standard social media dimensions (Square, Landscape, Portrait, Story). The canvas will resize to the chosen format, fitting the base image via center-crop, and export at the correct native resolution.

## Format Presets

```text
Format       Display (px)   Export (px)    Use Case
────────────────────────────────────────────────────────
Square       540×540        1080×1080      Instagram/Facebook post
Landscape    600×314        1200×628       Facebook link, Twitter/X
Portrait     400×500        1080×1350      Instagram portrait, Pinterest
Story        270×480        1080×1920      IG/FB Stories, TikTok, Reels
Original     (current)      (current)      No change — existing behavior
```

Display sizes are scaled down (max 600px wide) to fit the dialog; exports use the full native resolution.

## Changes

### 1. New types (`src/hooks/canvas/canvasTypes.ts`)
Add a `CanvasFormat` type with `label`, `displayWidth`, `displayHeight`, `exportWidth`, `exportHeight` fields, and export a `CANVAS_FORMATS` constant array containing the five presets above.

### 2. Canvas hook (`src/hooks/useCanvasEditor.ts`)
- Change signature to accept `baseImageUrl: string` plus an optional `format?: CanvasFormat` parameter.
- Add `activeFormat` state, defaulting to "Original" (image-driven sizing).
- Add a `setFormat(format)` function that updates `canvasSize` to the format's display dimensions and re-renders.
- Update `renderCanvas`: when a format is active, draw the base image using **center-crop** (calculate source crop rect to match the target aspect ratio, then `drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch)`). When "Original", keep current stretch behavior.
- Update `exportCanvas`: when a format is active, use the format's export dimensions instead of `baseImage.naturalWidth/Height`. Apply the same center-crop logic at export resolution.
- Support **blank canvas** mode: if no `baseImageUrl` is provided (empty string), skip image loading and fill with a configurable background color (default `#1a1a2e`). Add `setBgColor` to the return.

### 3. Template positions adaptation
- Convert `OVERLAY_TEMPLATES` text positions from absolute pixels to percentage-based values (e.g., `xPct: 0.05, yPct: 0.07`).
- In `applyTemplate`, multiply percentages by current `canvasSize` to compute actual `x`/`y`. This ensures templates look correct regardless of format.

### 4. Format selector UI (`src/components/media/AssetEditorDialog.tsx`)
- Add a **format button group** above the canvas showing icons/labels for each format (Square, Landscape, Portrait, Story, Original).
- Highlight the active format. Clicking a format calls `setFormat()`.
- Add a **background color picker** that appears when no base image is loaded or optionally alongside formats.
- The dialog prop changes from `baseImageUrl: string` to `baseImageUrl?: string` to support blank canvas creation.

### 5. Export filename
- Include the format name in the download filename, e.g., `asset-square-1080x1080-{timestamp}.png`.

## Files Modified
| File | Change |
|------|--------|
| `src/hooks/canvas/canvasTypes.ts` | Add `CanvasFormat` type and `CANVAS_FORMATS` constant |
| `src/hooks/useCanvasEditor.ts` | Add format state, center-crop rendering, blank canvas mode, updated export |
| `src/components/media/AssetEditorDialog.tsx` | Add format selector UI, background color picker, adaptive templates |

No database changes. No new dependencies. Purely front-end.

