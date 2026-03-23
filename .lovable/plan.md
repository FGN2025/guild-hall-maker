

## Assessment: Asset Editor Object Picking

### Current Problems

After reviewing `useCanvasEditor.ts` and `AssetEditorDialog.tsx`, the picking/interaction model has several gaps versus tools like Canva:

1. **Tight hit areas** — Hit testing uses exact bounding boxes with zero padding. Small text or thin logos are nearly impossible to click accurately.
2. **No hover preview** — Cursor changes to "grab" on hover, but there's no visual bounding-box highlight showing *which* object you're about to select. Users click blindly.
3. **No resize handles** — Objects can only be resized via sidebar sliders. There are no on-canvas drag handles at corners/edges, which is the standard in every graphics editor.
4. **No keyboard interaction** — No Delete key, no arrow-key nudging, no Escape to deselect. These are basic expectations.
5. **Overlapping objects are opaque** — When objects stack, there's no way to cycle through or pick the one underneath. The topmost always wins.
6. **Selection indicator is subtle** — Just a thin blue dashed rect. No corner handles, no rotation indicator — nothing that says "this is interactive."

### Proposed Improvements

#### 1. Expand hit areas with padding (quick win)
Add 6–8px padding around every overlay's bounding box in `hitTest()`. This makes small text and thin shapes much easier to click without affecting visual appearance.

#### 2. Hover bounding box preview
In `onMouseMove`, when not dragging, run `hitTest()` and store a `hoveredId`. In `renderCanvas()`, draw a light bounding box (e.g., semi-transparent blue border) around the hovered overlay. This gives users a clear "I'm about to select this" signal before clicking.

#### 3. On-canvas resize handles
When an overlay is selected, draw 8 small squares (4 corners + 4 edge midpoints) on the selection bounding box. On mousedown, detect if the click lands on a handle instead of the body — if so, enter resize mode instead of drag mode. During resize, update width/height (and for logos, maintain aspect ratio by default).

#### 4. Keyboard shortcuts
Add a `keydown` listener on the canvas (make it focusable with `tabIndex={0}`):
- **Delete / Backspace** → delete selected overlay
- **Arrow keys** → nudge selected overlay by 1px (10px with Shift)
- **Escape** → deselect
- **Tab** → cycle selection through overlays

#### 5. Click-through for stacked objects
When clicking an already-selected object, cycle to the next object underneath at the same coordinates. This lets users reach buried layers without using the layers panel.

#### 6. Richer selection visuals
Replace the plain dashed rect with solid corner handles (small filled squares) and a thin solid border. This is the universal "selected object" visual language.

### Files to modify

- **`src/hooks/useCanvasEditor.ts`** — Add `hoveredId` state, expand hit-test padding, implement resize handle detection, add keyboard handler, implement click-through cycling
- **`src/components/media/AssetEditorDialog.tsx`** — Pass `hoveredId` to rendering, add `tabIndex` and `onKeyDown` to canvas, expose new resize cursor styles
- **`src/hooks/canvas/canvasTypes.ts`** — Add `ResizeHandle` type for the 8 handle positions

### Implementation order

| Step | Change | Impact |
|------|--------|--------|
| 1 | Expand hit-test padding + hover highlight | Biggest UX win, lowest risk |
| 2 | Keyboard shortcuts (Delete, arrows, Esc) | Essential usability |
| 3 | Richer selection visuals (corner handles) | Visual clarity |
| 4 | On-canvas resize handles (drag to resize) | Core Canva-like interaction |
| 5 | Click-through cycling for stacked objects | Power-user feature |

