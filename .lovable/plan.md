

## Fix: Add PageBackground to the Tournaments Page

### Root Cause
The Tournaments page (`src/pages/Tournaments.tsx`) does not import or render the `PageBackground` component. Every other page that displays a background image (Leaderboard, Dashboard, Community, etc.) includes it. The database flag was correctly set to `supports_background = true`, but the component was never wired into the page.

### Changes Required

**File: `src/pages/Tournaments.tsx`**

1. Import `PageBackground` from `@/components/PageBackground`.
2. Add `relative` to the outer wrapper div's className (needed so the absolutely-positioned background image stays contained).
3. Render `<PageBackground pageSlug="tournaments" />` inside the wrapper, before the content.
4. Add `relative z-10` to the content container div so it sits above the background layer.

### Before vs After (simplified)

```text
BEFORE:
<div className="min-h-screen bg-background grid-bg">
  <div className="py-8 container ...">
    ...

AFTER:
<div className="min-h-screen bg-background grid-bg relative">
  <PageBackground pageSlug="tournaments" />
  <div className="py-8 container ... relative z-10">
    ...
```

This matches the exact pattern used on Leaderboard, Dashboard, Community, and all other pages with working backgrounds. No database or backend changes are needed.

