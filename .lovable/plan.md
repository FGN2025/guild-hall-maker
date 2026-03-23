

## Fix Grey Band Below Dashboard Header

The sticky header div on line 62 of `Dashboard.tsx` has `pb-4` which adds bottom padding inside the backdrop-blurred container — this renders as a visible grey band below the "Player Dashboard" title.

### Change

**`src/pages/Dashboard.tsx`** — Remove `pb-4` from the sticky header div. The `space-y-6` on the parent already provides spacing between the header and the content below.

```tsx
// Before
<div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 pt-4 md:pt-6 pb-4">

// After
<div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 pt-4 md:pt-6">
```

Single line change — removes the grey band while preserving all spacing via the existing `space-y-6` gap.

