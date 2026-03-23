

## Add More Shapes to Canvas Editor (PowerPoint-style)

### Current State
The editor supports 3 shapes: **rect**, **circle**, **line**. Users expect a richer set like PowerPoint offers.

### New Shapes to Add
- **Triangle** — equilateral, drawn via 3-point path
- **Diamond** — rotated rectangle (rhombus)
- **Rounded Rectangle** — rect with `roundRect` corner radius
- **Arrow** — horizontal arrow with triangular head
- **Star** — 5-pointed star
- **Hexagon** — regular 6-sided polygon

### Files to Edit

**1. `src/hooks/canvas/canvasTypes.ts`**
- Extend `ShapeOverlay.shape` union: `"rect" | "circle" | "line" | "triangle" | "diamond" | "rounded-rect" | "arrow" | "star" | "hexagon"`
- Add optional `cornerRadius` field for rounded rect

**2. `src/hooks/useCanvasEditor.ts`**
- Extend `drawShape()` with rendering logic for each new shape using Canvas path APIs
- Update `addShape()` defaults (sensible width/height per shape)

**3. `src/hooks/canvas/useCanvasInteraction.ts`**
- Add geometry-aware hit testing for new shapes (polygon point-in-path tests, or fall back to bounding-box for simplicity with the existing padding)

**4. `src/components/media/AssetEditorDialog.tsx`**
- Add new shape options to the Shapes dropdown menu with appropriate icons (Triangle, Diamond, Hexagon, Star, ArrowRight from lucide-react)

### Rendering Approach
Each shape is drawn via `ctx.beginPath()` + polygon vertices, using the overlay's `x, y, width, height` as the bounding box. Fill and stroke use existing `fillColor`, `strokeColor`, `strokeWidth`, `opacity` properties — no new UI controls needed for the properties panel.

### Hit Testing
Use canvas `ctx.isPointInPath()` for complex polygons, or simple bounding-box hit testing (already works for rect/circle). The bounding box approach is sufficient since all new shapes fit within their `x, y, width, height` bounds.

