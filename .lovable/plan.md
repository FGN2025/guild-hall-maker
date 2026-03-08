

## Issue

The `embed_widget` section type in `SectionEditor.tsx` only has manual text fields (Label + Embed Code HTML textarea). It lacks a button to open the `MediaPickerDialog` filtered to the `widget` category, which would let users pick a saved embed from the Media Library and auto-populate the `embed_code` field.

By contrast, other section types (hero, cta, banner) all have a media picker button via the `UrlField` helper or direct `MediaPickerDialog` integration.

## Plan

**File: `src/components/webpages/SectionEditor.tsx`** — Update the `embed_widget` case:

1. Add a "Pick from Widget Library" button (using the `Code2` or `Image` icon) next to the Embed Code textarea label.
2. When clicked, open `MediaPickerDialog` filtered to category `widget` (pass `excludeCategories` to show only widgets, or add a new prop to filter *to* a category).
3. On selection, if the selected media item has `embed_code`, set `c.embed_code` to that value; also set `c.label` to the item's `file_name` if label is empty.
4. Include the `MediaPickerDialog` instance in the rendered JSX (same pattern as other section types).

Since `MediaPickerDialog.onSelect` returns a URL (not embed_code), we need a small adjustment: either pass the embed_code through a second callback parameter, or query the media item from the `filtered` list by URL to extract `embed_code`. The simplest approach is to update `onSelect` to also pass the full `MediaItem` object so the consumer can read `embed_code` from it — but that changes the shared interface. 

**Simpler approach**: In the `embed_widget` handler, after the user picks a widget, we look up the item by URL from the hook's media list and read its `embed_code`. We can do this by:
- Using `useMediaLibrary("widget")` locally, or
- Extending `MediaPickerDialog`'s `onSelect` signature to `(url: string, filePath?: string, item?: MediaItem)`.

**Recommended**: Extend `onSelect` to pass the full item as a third optional parameter — minimal change, backward-compatible, and useful for future cases too.

### Changes

| File | Change |
|---|---|
| `MediaPickerDialog.tsx` | Pass full `MediaItem` as third arg in `onSelect` callback |
| `SectionEditor.tsx` | Add a "Pick Widget" button in the `embed_widget` case that opens `MediaPickerDialog` filtered to `widget`, and on select reads `item.embed_code` to populate the field |

