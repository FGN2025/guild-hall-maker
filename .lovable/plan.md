

## Add Font Family, Bold, Italic, and Underline to Text Overlays

### What changes

**1. Extend `TextOverlay` type** (`src/hooks/canvas/canvasTypes.ts`)
- Add `fontWeight: string` (default `"normal"`, options: `"normal"` | `"bold"`)
- Add `fontStyle: string` (default `"normal"`, options: `"normal"` | `"italic"`)
- Add `textDecoration: string` (default `"none"`, options: `"none"` | `"underline"`)

**2. Update canvas rendering** (`src/hooks/useCanvasEditor.ts`)
- Change `ctx.font` construction from `${fontSize}px ${fontFamily}` to `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
- For underline: manually draw a line beneath the text using `measureText` width
- Apply same logic in the export renderer

**3. Update text hit-testing** (`src/hooks/canvas/useCanvasInteraction.ts`)
- Include `fontStyle` and `fontWeight` when constructing the font string for `measureText` calls in `getOverlayBounds`

**4. Add UI controls** (`src/components/media/AssetEditorDialog.tsx`)
- **Font family dropdown** — a `Select` with common web-safe fonts: Sans-serif, Serif, Monospace, Georgia, Verdana, Courier New, Impact, Comic Sans MS, Trebuchet MS, Arial Black
- **Bold / Italic / Underline toggle buttons** — a row of icon toggles (B, I, U) using the existing `Toggle` component
- Place these between the Text input and Font Size slider in the text properties panel

### Files to edit
- `src/hooks/canvas/canvasTypes.ts` — add 3 fields to `TextOverlay`
- `src/hooks/useCanvasEditor.ts` — update font string in render + export, draw underline, set defaults in `addText`
- `src/hooks/canvas/useCanvasInteraction.ts` — update font string in `getOverlayBounds`
- `src/components/media/AssetEditorDialog.tsx` — add font picker Select + B/I/U toggles

