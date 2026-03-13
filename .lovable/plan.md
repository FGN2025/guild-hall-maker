

## Plan: Add Responsive Padding to Homepage Sections

### Problem
On iPad-sized viewports, the homepage content sits too close to the screen edges. The current padding is `px-4` (16px) across all breakpoints.

### Solution
Increase horizontal padding responsively across all homepage sections by changing `px-4` to `px-6 md:px-10 lg:px-16` (24px → 40px → 64px). This affects:

1. **`src/components/TickerEmbed.tsx`** — container div `px-4` → `px-6 md:px-10 lg:px-16`
2. **`src/components/FeaturedVideo.tsx`** — container div (both loading skeleton and main render)
3. **`src/components/FeaturedEvents.tsx`** — container div
4. **`src/components/HeroSection.tsx`** — container div
5. **`src/pages/Index.tsx`** — footer container div

All changes are class-name-only updates to existing `px-4` values. No logic or structural changes.

