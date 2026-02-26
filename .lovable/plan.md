

## In-App Marketing Asset Editor (Canvas Overlay Tool)

### Overview
Build a lightweight HTML5 Canvas-based editor that lets users overlay logos and text onto marketing assets. This editor will be accessible from both the Admin Marketing page and the Tenant "My Assets" page, allowing users to customize assets before saving.

### Architecture

```text
+---------------------------+
|  AssetEditorDialog        |
|  +---------------------+  |
|  | Canvas Preview       |  |
|  | - Base image layer   |  |
|  | - Logo overlay(s)    |  |
|  | - Text overlay(s)    |  |
|  +---------------------+  |
|  | Toolbar               |  |
|  | [Add Logo] [Add Text] |  |
|  | [Position] [Size]     |  |
|  | [Save] [Export]        |  |
|  +---------------------+  |
+---------------------------+
```

### 1. New Component: `AssetEditorDialog`

Create `src/components/media/AssetEditorDialog.tsx`:

- Accepts a `baseImageUrl` prop (the asset to edit)
- Uses an HTML5 Canvas to composite layers:
  - **Base layer**: The original marketing asset image
  - **Logo overlays**: Upload or pick a logo, drag to position, resize with handles
  - **Text overlays**: Add text with configurable font size, color, and position
- Toolbar controls:
  - "Add Logo" button (file upload for PNG/SVG logos)
  - "Add Text" button (opens inline text input with font size and color pickers)
  - Position controls (drag-to-place on canvas with mouse events)
  - "Save" button -- exports the canvas as a PNG and uploads to storage as a new tenant marketing asset
  - "Cancel" button to discard changes

### 2. Canvas Rendering Logic

Create `src/hooks/useCanvasEditor.ts`:

- Manages editor state: overlays array (each overlay has type, position, size, content)
- Handles mouse events for drag-to-position on the canvas
- `renderCanvas()` function: draws base image, then each overlay in order
- `exportCanvas()` function: converts canvas to Blob for upload
- Overlay types:
  - `{ type: "logo", src: string, x: number, y: number, width: number, height: number }`
  - `{ type: "text", text: string, x: number, y: number, fontSize: number, color: string }`

### 3. Integration Points

**Tenant Marketing Assets page** (`TenantMarketingAssets.tsx`):
- Add an "Edit" button (Pencil icon) on each asset card
- Clicking opens `AssetEditorDialog` with the asset's URL as the base image
- On save, uploads the edited image as a new asset linked to the original via `source_asset_id`

**Tenant Marketing Detail page** (`TenantMarketingDetail.tsx`):
- Add a "Customize" button next to the existing "Save" and "Download" buttons on each asset variant
- Opens `AssetEditorDialog` with the master asset as the base
- On save, creates a new `tenant_marketing_assets` record

**Admin Marketing page** (`AdminMarketing.tsx`):
- Add an "Edit" button on campaign assets in the `CampaignAssetsDialog`
- Allows admins to preview the overlay editor on master assets

### 4. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useCanvasEditor.ts` | Create | Canvas state management, drag logic, render and export functions |
| `src/components/media/AssetEditorDialog.tsx` | Create | Dialog wrapper with canvas preview, toolbar, and overlay controls |
| `src/pages/tenant/TenantMarketingAssets.tsx` | Modify | Add "Edit" button on asset cards |
| `src/pages/tenant/TenantMarketingDetail.tsx` | Modify | Add "Customize" button on master asset variants |
| `src/pages/admin/AdminMarketing.tsx` | Modify | Add "Edit" button in campaign assets dialog |

### 5. Key Design Decisions

- **No external dependencies** -- pure HTML5 Canvas API, no heavy libraries needed
- **Non-destructive editing** -- the original asset is never modified; edits produce a new asset
- **Simple drag positioning** -- mouse down/move/up events on the canvas for placing overlays
- **PNG export** -- `canvas.toBlob()` produces the final composite image
- **Reusable** -- the editor component works for both admin and tenant contexts via props

### 6. Future Canva Integration Hook

The editor dialog will include a placeholder "Open in Canva" button (disabled, labeled "Coming Soon") to set the stage for the planned Canva Autofill API integration. This keeps the hybrid roadmap visible to users.

