

## Problem

The sticky header on `/tournaments` floats slightly below the top of the scrollable area instead of sitting flush. The root cause is the parent container's `space-y-6` class. Tailwind's `space-y-6` applies `margin-top: 1.5rem` to every child after the first. Since `PageBackground` is the first child and the sticky header div is the second, it receives a `1.5rem` top margin that prevents it from reaching `top: 0` when stuck.

## Fix

**File: `src/pages/Tournaments.tsx`**

Replace `space-y-6` on the outer wrapper with a structure that excludes the sticky header from the spacing:

1. Remove `space-y-6` from the outer `<div>` wrapper.
2. Move `PageBackground` outside the wrapper (it's position-fixed/absolute, so placement doesn't matter).
3. Keep the sticky header as the first child with no top margin.
4. Add `space-y-6` (or `mt-6`) only to the content below the sticky header, so tournament cards and pagination get proper spacing without affecting the sticky element.

This is a single-file, ~3-line change.

