# Challenges: Return Button to the Game-Tile Hub

Add a clear, styled return button on every challenges sub-page so players can always get back to the tiled game hub (`/challenges`). Today each game community page has only a small text link ("Back to Games") that is easy to miss, and the "Show all challenges" list has no return path at all.

## Changes

1. **Game community pages (`/challenges/game/:slug`)**
   - Replace the plain text link at the top of `src/pages/GameChallenges.tsx` with a real button (shadcn `Button`, outline style) labeled "All Game Communities" with a back arrow, tinted with the game's accent color on hover.
   - Keep it in the same position above the hero so the path back is obvious on desktop and mobile.

2. **Show all challenges list (`/challenges/all`)**
   - Add the same "All Game Communities" back button at the top of `src/pages/Challenges.tsx` (it currently has none).

3. **Guests and tenant mode**
   - The button is a plain link — works identically for signed-in players and guests.
   - No changes to tenant staff scheduling screens, marketing, dispatch, the September queue, approved posts, or the kill switch. No database changes.

## Verification

- Type-check passes.
- Playwright: open `/challenges/game/american-truck-simulator` and `/challenges/all`, confirm the button renders and clicking it returns to the tiled hub on desktop and mobile widths.
