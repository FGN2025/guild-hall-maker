

# Canvas Editor Enhancement — Complete Plan

## Summary
Add three features to the asset editor in a single update: (1) visual template gallery with locked zones, (2) shape primitives, (3) overlay image library from media picker. Includes full z-order controls (bring forward / send backward) in the layers panel.

---

## 1. Extend Type System — `canvasTypes.ts`

- Add `ShapeOverlay` type: `{ type: "shape", shape: "rect"|"circle"|"line", fillColor, strokeColor, strokeWidth, opacity, x, y, width, height, locked? }`
- Add `locked?: boolean` to `LogoOverlay` and `TextOverlay`
- Update `Overlay` union to include `ShapeOverlay`
- Add `TemplateDefinition` and `TemplateZone` types for the visual gallery metadata

## 2. Canvas Engine — `useCanvasEditor.ts`

- **Shape rendering**: Add branch in `renderCanvas` for shapes (`ctx.globalAlpha`, `fillRect`, `arc`, `moveTo/lineTo`)
- **Shape hit-testing**: Bounding-box for rect/circle, proximity for line
- **Shape export**: Same branch in `exportCanvas` with scale factors
- **Lock enforcement**: Skip position updates in `onMouseMove`/`onTouchMove` when `overlay.locked === true`
- **New methods**:
  - `addShape(shape)` — creates default ShapeOverlay
  - `addLogoFromUrl(url)` — loads image from URL, creates LogoOverlay
  - `reorderOverlay(id, direction: "up"|"down"|"front"|"back")` — supports bring forward, send backward, bring to front, send to back

## 3. Snap System — `useCanvasSnap.ts`

- Add `getRect` case for `type === "shape"` returning `{ x, y, w: width, h: height }`

## 4. New Component — `TemplateGalleryPanel.tsx`

- Renders 5 template cards with mini canvas thumbnail previews
- Each card shows name, description, and visual preview generated on mount
- On click, calls `applyTemplate()` with zone positions and `locked` flags on designated overlays
- Used inside a popover/sheet replacing the current text-list popover

## 5. UI Updates — `AssetEditorDialog.tsx`

**Toolbar additions**:
- Replace Templates popover internals with `TemplateGalleryPanel`
- Add "Shape" dropdown (rect / circle / line)
- Add "From Library" button → opens existing `MediaPickerDialog` → calls `addLogoFromUrl`

**Layers panel enhancements**:
- Shape icon for shape overlays, lock icon for locked overlays
- **Z-order controls per layer**: Bring Forward (↑), Send Backward (↓) buttons — visible on hover or when selected
- Lock/unlock toggle button per overlay

**Properties panel**:
- Shape properties: fill color, stroke color, stroke width slider, opacity slider
- Lock indicator shown on all overlay types when locked

## Files Changed

| File | Action |
|---|---|
| `src/hooks/canvas/canvasTypes.ts` | Modify — add ShapeOverlay, locked flag, TemplateDefinition |
| `src/hooks/useCanvasEditor.ts` | Modify — shape render/hit/export, lock, addShape, addLogoFromUrl, reorderOverlay |
| `src/hooks/canvas/useCanvasSnap.ts` | Modify — shape rect calculation |
| `src/components/media/TemplateGalleryPanel.tsx` | **New** — visual template gallery |
| `src/components/media/AssetEditorDialog.tsx` | Modify — shape toolbar, library picker, z-order controls, lock toggle, shape properties |

No database or backend changes required.

## Z-Order Controls — Detail

The `reorderOverlay` method supports four operations on the overlays array:

- **Bring Forward** — swap with next item (index + 1)
- **Send Backward** — swap with previous item (index - 1)
- **Bring to Front** — move to end of array
- **Send to Back** — move to start of array

All four will be accessible from the layers panel. Bring Forward / Send Backward shown as arrow buttons; Bring to Front / Send to Back available via a small dropdown or shift+click.

