# Manual background pan and zoom in the Asset Editor

Today the background photo is always center-cropped to the chosen format — there is no way to nudge it or scale it. This adds manual control so the user can decide exactly what part of the artwork shows.

## What the user gets

- A **Background** section addition with:
  - **Zoom** slider (100%–300%) plus `+` / `−` buttons and a **Reset** button.
  - **Pan** by dragging the background directly on the canvas (drag on empty space where no text/logo/shape is hit) — arrow-key nudging when nothing is selected.
  - Live preview; the pan/zoom is applied identically to the exported image.
- Mouse-wheel / trackpad zoom over the canvas, anchored at the cursor, so the point under the pointer stays put.
- Pan is clamped so the image can never expose empty edges (at zoom 100% it can only move within available crop slack; above 100% it moves freely inside the frame).
- Switching format keeps the current zoom and re-clamps the offset instead of resetting the user's framing.

## Technical notes

**`src/hooks/useCanvasEditor.ts`**
- New state `bgZoom` (default 1) and `bgOffset` `{x, y}` in normalized units (fraction of the crop slack), so the framing survives format switches and export scaling.
- Replace direct `centerCropRect` use with a `computeSourceRect(imgW, imgH, targetW, targetH, zoom, offset)` helper: start from the center-crop rect, divide `sw`/`sh` by zoom, then shift `sx`/`sy` by the offset, clamped to `[0, imgW - sw]` / `[0, imgH - sh]`. Used by both `renderCanvas` and `exportCanvas`, and applied in the `original` format path too (currently unzoomable).
- Expose `bgZoom`, `setBgZoom`, `bgOffset`, `panBackground(dxPx, dyPx)`, `zoomBackgroundAt(factor, cursorPoint)` and `resetBackgroundTransform`.
- Background transform changes go through the existing history stack alongside overlays so undo/redo covers them.

**`src/hooks/canvas/useCanvasInteraction.ts`**
- When a mousedown/touchstart misses every overlay, start a background-pan drag instead of only clearing selection; move deltas (converted to canvas space) call `panBackground`. Keep the 4px drag threshold so a plain click still deselects.
- Cursor becomes `grab`/`grabbing` over empty canvas.

**`src/components/media/AssetEditorDialog.tsx`**
- Attach a native non-passive `wheel` listener to the canvas (React's `onWheel` is passive, so `preventDefault` would be ignored); normalize `deltaMode`, scale exponentially (`exp(-dy * 0.0015)`), clamp 1–3, and anchor at the cursor.
- Add the Zoom slider, `+`/`−`, and Reset controls to the existing Background panel next to Opacity/Tint.
- Persist `bgZoom` / `bgOffset` into the saved `overlay_config` on save, and restore them on open, so re-opening an asset keeps the manual framing.

Composer-generated (Tier 2 reflow) assets are unaffected: a re-compose keeps the user's background transform and only re-lays the text.
