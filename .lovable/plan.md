

## Problem

The `GameServers` page component exists at `src/pages/GameServers.tsx` but has no public route defined in `App.tsx`. The only game-servers route is `/admin/game-servers`, which is admin-only. Navigating to `/game-servers` results in a 404.

## Plan

### 1. Add public `/game-servers` route to `App.tsx`

Add a new route for the public-facing Game Servers page, accessible to both authenticated and unauthenticated users. This follows the same pattern as other public routes (Tournaments, Challenges) that use the `ConditionalLayout` wrapper for guest/auth layout switching.

- Import `GameServers` from `src/pages/GameServers.tsx`
- Add `<Route path="/game-servers" element={<GameServers />} />` inside the appropriate layout group (public-accessible routes under `ConditionalLayout`)

### 2. Optionally add sidebar/nav link

Add a "Game Servers" link to the sidebar or navigation so authenticated users can discover it. This depends on whether a nav entry already exists or needs to be created.

**Scope**: Two small edits — one route addition in `App.tsx`, one optional nav link.

