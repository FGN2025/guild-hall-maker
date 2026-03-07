

# Fix Canvas Cursor Behavior for Standard Editor UX

## Problem
The canvas always shows a crosshair cursor (`cursor-crosshair` on line 170 of `AssetEditorDialog.tsx`), making it feel like a drawing tool rather than a selection-based editor like PowerPoint or Canva. Users expect:
- **Default arrow** when hovering empty canvas
- **Grab hand** when hovering over a movable overlay
- **Grab (closed)** while actively dragging
- **Not-allowed** when hovering a locked overlay

## Solution
Track cursor state dynamically based on mouse position and drag state, then apply the appropriate CSS cursor class to the canvas.

### Changes

**`useCanvasEditor.ts`**
- Add a `cursorStyle` state (`"default" | "grab" | "grabbing" | "not-allowed"`)
- In `onMouseMove`: when not dragging, run `hitTest` on hover position — set cursor to `"grab"` if over unlocked overlay, `"not-allowed"` if locked, `"default"` if empty space
- In `onMouseDown`: set `"grabbing"` when starting a drag
- In `onMouseUp`: reset to `"default"`
- Export `cursorStyle` from the hook

**`AssetEditorDialog.tsx`**
- Remove hardcoded `cursor-crosshair` from the canvas element
- Apply dynamic cursor class from `cursorStyle`: `cursor-default`, `cursor-grab`, `cursor-grabbing`, or `cursor-not-allowed`

| File | Change |
|---|---|
| `src/hooks/useCanvasEditor.ts` | Add `cursorStyle` state, update in mouse/touch handlers, export it |
| `src/components/media/AssetEditorDialog.tsx` | Replace `cursor-crosshair` with dynamic `cursor-${cursorStyle}` |

No database changes needed.

