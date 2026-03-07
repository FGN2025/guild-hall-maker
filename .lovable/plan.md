

# Fix: Show Thumbnail for Embed Widgets in MediaGrid

## Problem
`MediaGrid.tsx` line 134 only renders an `<img>` tag when `file_type === "image"`. Embed widgets that have a real thumbnail URL (uploaded or pasted) still show only the Code2 icon because they have `file_type === "embed"`.

## Fix
Update the image rendering condition in `MediaGrid.tsx` to also show the thumbnail for embed items that have a real URL (not the fallback string `"embed"`).

**Change** (line 134-138):
```tsx
// Before
{item.file_type === "image" ? (
  <img src={item.url} alt={item.file_name} className="w-full h-full object-cover" />
) : (
  <Icon className="h-10 w-10 text-muted-foreground" />
)}

// After
{item.file_type === "image" || (item.file_type === "embed" && item.url && item.url !== "embed") ? (
  <img src={item.url} alt={item.file_name} className="w-full h-full object-cover" />
) : (
  <Icon className="h-10 w-10 text-muted-foreground" />
)}
```

Single file change: `src/components/media/MediaGrid.tsx`

