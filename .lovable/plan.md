
## Assessment

The grey bar is not the tournaments sticky header anymore. It is the global `AppLayout` header:

- `src/components/AppLayout.tsx` always renders:
  - a fixed-height top header (`h-12`)
  - `bg-background`
  - a bottom border
  - the `SidebarTrigger`
- Logged-in users on `/tournaments` go through `ConditionalLayout` → `AppLayout`, so that top bar is always present.
- The tournaments page sticky header is inside `<main>`, below that global header. Negative `top` values can only offset within the padded scroll area; they cannot remove the separate layout header above it.

That matches the screenshot: the grey strip with the small sidebar button at the far left is the shared app header, not page-specific spacing.

## Recommended fix

### Best fix
Make the tournaments page use a “headerless content” mode inside `AppLayout`, then place the sidebar trigger inside the tournaments sticky header.

## Implementation plan

1. **Add route-aware header suppression in `AppLayout`**
   - Use the current route to detect `/tournaments`.
   - Skip rendering the global `<header>` for that route only.
   - Let `<main>` expand to full height when the header is hidden.

2. **Preserve navigation access**
   - Add `SidebarTrigger` into `src/pages/Tournaments.tsx` inside the sticky header row.
   - Keep it visible at least on mobile/tablet so users can still open the sidebar.
   - Align it with the page title so the sticky area becomes the only top bar.

3. **Adjust tournaments sticky container after header removal**
   - Remove the compensating negative top hacks that were added to fight the old layout padding/header interaction.
   - Re-test the sticky container with a simple `top-0` (or a minimal negative offset only if needed because of main padding).
   - Keep the opaque background and horizontal bleed handling so cards do not show through while scrolling.

4. **Verify no regressions**
   - Confirm `/tournaments` sits flush to the top with no grey strip.
   - Confirm sidebar access still works on smaller screens.
   - Confirm other authenticated pages still keep the shared top header unchanged.

## Files to update

- `src/components/AppLayout.tsx`
- `src/pages/Tournaments.tsx`

## Why this is the right fix

The current issue is structural, not a sticky-position bug. The page is being rendered underneath a shared layout header. As long as that header exists, a top bar will remain visible no matter how the tournaments sticky header is adjusted. The fix is to remove the shared header for this route and merge its control into the page’s own sticky header.
