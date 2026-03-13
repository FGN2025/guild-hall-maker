

## Plan: Fix Featured Event Card Images on iPhone

### Problem
Images in Featured Event cards are not rendering on iPhone/Safari. The cards use Supabase storage URLs which are publicly accessible, so this is a Safari-specific rendering issue rather than a network/CORS problem.

### Root Cause
Safari on iPhone has known issues rendering images inside flex containers with `overflow-hidden` when the image relies on `h-full` to inherit height. The image can collapse to 0px height because Safari doesn't resolve the intrinsic size the same way Chrome does.

### Fix — Single file: `src/components/FeaturedEvents.tsx`

1. **Add explicit dimensions to the `<img>` tag** — add `width` and `height` attributes to give Safari an intrinsic aspect ratio hint
2. **Add `min-h-[144px]`** to the image container div (backup for the `h-36` class)
3. **Add `loading="eager"`** to prevent lazy-loading from interfering on mobile viewports where the cards may be just outside the initial viewport threshold

```tsx
// Before
<div className="relative h-36 bg-muted overflow-hidden">
  <img src={e.imageUrl} alt={e.title} className="w-full h-full object-cover" />

// After
<div className="relative h-36 min-h-[144px] bg-muted overflow-hidden">
  <img src={e.imageUrl} alt={e.title} className="w-full h-full object-cover" loading="eager" width={400} height={144} />
```

Same fix applies to the gradient placeholder fallback (add `min-h-[144px]` to container).

No database or backend changes needed.

