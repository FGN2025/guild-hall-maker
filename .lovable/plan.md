

## Plan: Remove Stats Cards from Home Page

Remove the stats bar (Players / Tournaments / Operators Served cards) from the bottom of the `HeroSection` component.

### Change

**`src/components/HeroSection.tsx`**: Delete the stats bar `<div>` block (the `animate-fade-in grid grid-cols-1 sm:grid-cols-3` section) and remove the `useHeroStats` hook call and its definition since it will no longer be used. Also remove the unused `Users` and `Building2` icon imports.

