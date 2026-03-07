

# Filter Background Assets from Overlay Picker

## Problem
After a user selects a tournament or challenge as the promo background, the "From Library" overlay picker still shows tournament, game, and challenge assets. These are background-sized images not suitable as overlays.

## Changes

**`MediaPickerDialog.tsx`**
- Add optional `excludeCategories?: string[]` prop
- Filter those categories from the `TABS` array
- When `tab === "all"`, also filter results whose `category` matches any excluded value

**`AssetEditorDialog.tsx`** (line ~491)
- Pass `excludeCategories={["tournament", "games", "challenges"]}` to `MediaPickerDialog`

| File | Change |
|---|---|
| `src/components/media/MediaPickerDialog.tsx` | Add `excludeCategories` prop, filter tabs and results |
| `src/components/media/AssetEditorDialog.tsx` | Pass `excludeCategories` to picker |

No database changes.

