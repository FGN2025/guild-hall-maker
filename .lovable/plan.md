

## Fix: Sticky Header Gap on Tournaments Page

The grey bar and misaligned sticky header are caused by the interaction between the `main` container's padding (`p-4 md:p-6`) and the sticky header's `top-0` positioning.

**Root cause:** The `<main>` in AppLayout has `p-4 md:p-6` padding. The sticky div sits inside this padded area, so when content scrolls, `top-0` sticks it at the top of the *content box* (after padding). This leaves a visible gap (the "grey bar") between the viewport's scroll edge and the sticky header. Additionally, `bg-background/95` is semi-transparent, so scrolled card content bleeds through.

### Fix in `src/pages/Tournaments.tsx` (line 86)

1. Add negative top margin + compensating top padding (`-mt-4 pt-4 md:-mt-6 md:pt-6`) to pull the sticky header flush with the scroll container's visible top edge
2. Change `bg-background/95` to `bg-background` (fully opaque) to prevent content bleed-through

```
Before:
<div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 pb-4">

After:
<div className="sticky top-0 z-20 bg-background -mx-4 px-4 md:-mx-6 md:px-6 -mt-4 pt-4 md:-mt-6 md:pt-6 pb-4">
```

Single file change, single line edit.

