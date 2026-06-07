## Problem

The "Importing a module script failed" error flashes on mobile when navigating to pages like Challenges, Tournaments, Quests. This is a well-known issue: pages are code-split into lazy chunks, and when a new version is deployed, the old chunk filenames (cached in the user's open tab) no longer exist on the server. React's `lazy()` import throws, the ErrorBoundary catches it and shows "Something went wrong" until the user taps Return Home.

The session replay confirms it: every navigation to a lazy route (`/tournaments`, `/challenges`, `/quests`) triggers "Importing a module script failed".

## Fix

Detect this specific class of error in `src/components/ErrorBoundary.tsx` and auto-reload the page once (using a `sessionStorage` flag to prevent infinite reload loops if something is genuinely broken).

### Changes

**`src/components/ErrorBoundary.tsx`**
- In `componentDidCatch`, detect chunk-load errors by matching the error message against the known patterns:
  - `Importing a module script failed`
  - `Failed to fetch dynamically imported module`
  - `error loading dynamically imported module`
  - `ChunkLoadError`
- If matched AND `sessionStorage` flag `chunk-reload-attempted` is not set:
  - Set the flag
  - Call `window.location.reload()` — the browser fetches `index.html` again and gets the current chunk manifest, so the navigation succeeds transparently
- If the flag is already set (we already tried once), fall through to the existing error UI so we don't loop
- Clear the flag on successful render (in `componentDidMount` or via a top-level effect) so future stale-chunk errors can recover again

No other files need changes. This is purely a presentation-layer fix.

## Why not change the bundler

Vite already hashes chunk filenames; the root cause is that the user's tab is older than the latest deploy. Auto-reload on chunk error is the standard, low-risk fix used across the React ecosystem.
