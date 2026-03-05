

# Fix Touch Support for Canvas Editor on iPad

## Problem
The canvas editor only uses `onMouseDown`, `onMouseMove`, and `onMouseUp` events. These do not fire on touch devices (iPad, phones). Touch devices use `onTouchStart`, `onTouchMove`, and `onTouchEnd` instead.

## Solution
Add touch event handlers in `useCanvasEditor.ts` that extract touch coordinates and delegate to the same drag logic. Bind them on the canvas in `AssetEditorDialog.tsx`.

### Changes

**`src/hooks/useCanvasEditor.ts`**
- Add `onTouchStart` handler: extract first touch point, call the same hit-test and drag-start logic as `onMouseDown`. Call `e.preventDefault()` to stop scroll/zoom while dragging.
- Add `onTouchMove` handler: extract first touch point, run the same snap-and-move logic as `onMouseMove`.
- Add `onTouchEnd` handler: delegate to `onMouseUp`.
- Export all three new handlers.

**`src/components/media/AssetEditorDialog.tsx`**
- Destructure `onTouchStart`, `onTouchMove`, `onTouchEnd` from the hook.
- Bind them on the `<canvas>` element alongside the existing mouse handlers.

No other files affected. No database changes.

