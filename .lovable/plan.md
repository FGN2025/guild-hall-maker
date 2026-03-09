

## Problem Assessment

The core issue is that all dashboard layouts (Admin, Tenant, Moderator, Marketing) use `min-h-screen` on the outer container with `overflow-auto` on the `<main>` element, but the outer `<div>` itself has **no height constraint** -- it uses `min-h-screen` which allows it to grow beyond the viewport. This means:

1. **The `overflow-auto` on `<main>` never activates** because the parent grows unbounded, so content pushes the page taller instead of scrolling within the main area.
2. **The sidebar has no independent scroll** -- `TenantSidebar` uses `min-h-screen` with no `overflow-auto`, so if sidebar content exceeds the viewport, it gets clipped.
3. **On smaller screens or lower resolutions**, users cannot see content below the fold because the layout doesn't properly constrain height to the viewport and enable scrolling.

The same pattern affects `AdminLayout`, `ModeratorLayout`, `MarketingLayout`, and `TenantLayout`.

## Plan

### 1. Fix all four dashboard layouts (desktop variant)

Change the outer container from `min-h-screen` to `h-screen` (or `h-dvh` for mobile-safe viewport) and add `overflow-hidden` so children handle their own scrolling:

```
- <div className="min-h-screen bg-background flex">
+ <div className="h-screen bg-background flex overflow-hidden">
```

The `<main>` already has `overflow-auto` which will now work correctly since the parent constrains height.

**Files**: `TenantLayout.tsx`, `AdminLayout.tsx`, `ModeratorLayout.tsx`, `MarketingLayout.tsx`

### 2. Fix all four dashboard layouts (mobile variant)

Same change for the mobile flex-col variant:

```
- <div className="min-h-screen bg-background flex flex-col">
+ <div className="h-screen bg-background flex flex-col overflow-hidden">
```

### 3. Add scrolling to all sidebar components

The `TenantSidebar`, `AdminSidebar`, `ModeratorSidebar`, and `MarketingSidebar` use `min-h-screen` with no overflow. Change to:

```
- <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
+ <aside className="w-64 h-full bg-card border-r border-border flex flex-col overflow-hidden">
```

And wrap the `<nav>` content in `overflow-y-auto` (TenantSidebar already has `flex-1` on `<nav>`, just add `overflow-y-auto`).

**Files**: `TenantSidebar.tsx`, `AdminSidebar.tsx`, `ModeratorSidebar.tsx`, `MarketingSidebar.tsx`

### 4. Fix AppLayout (main player-facing layout)

Same pattern -- change outer div to `h-screen overflow-hidden`:

```
- <div className="min-h-screen flex w-full">
+ <div className="h-screen flex w-full overflow-hidden">
```

**File**: `AppLayout.tsx`

### Summary of files to edit

- `src/components/AppLayout.tsx`
- `src/components/admin/AdminLayout.tsx`
- `src/components/admin/MarketingLayout.tsx`
- `src/components/moderator/ModeratorLayout.tsx`
- `src/components/tenant/TenantLayout.tsx`
- `src/components/tenant/TenantSidebar.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/MarketingSidebar.tsx`
- `src/components/moderator/ModeratorSidebar.tsx`

