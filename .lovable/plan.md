

## Fix: Canvas Coordinate Scaling Bug (Text Picking)

### Root Cause

The canvas element has internal dimensions (e.g., 800x600) but is CSS-scaled down via `max-width: 100%` and `max-height: 60vh`. Mouse coordinates are calculated as:
```
mx = e.clientX - rect.left   // CSS pixels
my = e.clientY - rect.top    // CSS pixels
```

But overlay positions are stored in **canvas pixels**. When the canvas renders at, say, 500px wide CSS but is internally 800px, a click at CSS x=250 should map to canvas x=400. Currently it maps to x=250 — hitting the wrong objects entirely.

This affects all mouse and touch handlers: `onMouseDown`, `onMouseMove`, `onMouseUp`, `onTouchStart`, `onTouchMove`, `onTouchEnd`.

### Fix

1. **Add coordinate scaling in `useCanvasInteraction.ts`**
   - Create a helper that converts CSS mouse position to canvas coordinates:
     ```
     scaleX = canvas.width / rect.width
     scaleY = canvas.height / rect.height
     mx = (e.clientX - rect.left) * scaleX
     my = (e.clientY - rect.top) * scaleY
     ```
   - Apply this in all 6 mouse/touch handlers

2. **Also scale drag offsets**
   - When dragging, the offset and snap calculations must use canvas-space coordinates, not CSS-space. The same scaling factor applies to movement deltas during drag and resize.

### Files to update

- `src/hooks/canvas/useCanvasInteraction.ts` — Add `getCanvasCoords` helper, update all 6 event handlers to use scaled coordinates

### Why this fixes text picking

Text overlays are positioned at canvas coordinates (e.g., x=40, y=390). The hit test checks if the mouse is within 8px of those coordinates. But when the canvas is CSS-scaled to half size, the mouse reports x=20 for a visual click at x=40 — missing by 20px. With scaling applied, the coordinates will match and text becomes easy to select.

### Scope

This is a single-file, surgical fix. No changes to rendering, no changes to overlay types, no UI changes. Just correct coordinate math.

