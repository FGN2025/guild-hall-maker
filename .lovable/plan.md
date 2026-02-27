

## Add Element Picker / Layers Panel to Asset Editor

### Problem
Currently, the only way to select an overlay element on the canvas is by clicking directly on it, which can be difficult -- especially when elements overlap or are small. There is no visible list of all active layers.

### Solution
Add an **Element Picker (Layers Panel)** to the toolbar sidebar that lists every overlay on the canvas. Each row shows the element type (logo/text icon), a label (truncated text or "Logo"), and allows:
- **Click to select** -- highlights the element on canvas and shows its properties
- **Reorder via drag** (future) -- for now, visual list with click-to-select
- **Visibility of selection state** -- the currently selected element is highlighted in the list

### Changes

#### 1. `AssetEditorDialog.tsx` -- Add Layers Panel
- Import `overlays` and `setSelectedId` from the hook (already exposed)
- Add a new "Layers" section between the toolbar buttons and the properties panel
- Each layer row shows:
  - An icon: `ImagePlus` for logos, `Type` for text
  - A label: truncated `text` value for text overlays, "Logo" for logo overlays
  - A highlight ring when it matches `selectedId`
  - A delete button on hover
- Clicking a row calls `setSelectedId(overlay.id)` to select it and show its properties
- Add a `Layers` icon button to the toolbar row for visual consistency

#### 2. `useCanvasEditor.ts` -- Expose `overlays` and `selectedId`
These are already returned from the hook -- no changes needed here.

### UI Layout (in the toolbar sidebar)

```text
[Undo] [Redo] [Logo] [Text] [Templates]

--- Layers ----------------------------
| [T] TOURNAMENT              [trash] |  <-- selected (highlighted)
| [T] $500 Prize Pool         [trash] |
| [T] Game Title Here         [trash] |
| [img] Logo                  [trash] |
----------------------------------------

--- Text Properties --------------------
| Text: [TOURNAMENT________]          |
| Font Size: 52px  [====o====]        |
| Color: [#ffffff ████]                |
----------------------------------------
```

### Technical Details
- The layers list iterates `overlays` array (renders bottom-to-top, matching canvas z-order)
- Selected layer gets `bg-accent` or `ring-2 ring-primary` styling
- Truncate long text labels to ~18 characters with ellipsis
- Uses existing `selectedId`, `setSelectedId`, and `deleteOverlay` -- no new hook logic needed
- Only UI changes in `AssetEditorDialog.tsx`

