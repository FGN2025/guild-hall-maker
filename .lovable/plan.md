

## Add NAW Logo and Event Highlight to Tournament Calendar

### Change 1 — NAW Logo in Calendar Page Header

Copy the uploaded logo to `src/assets/naw-calendar-logo-2026.png`. Update the header in `TournamentCalendar.tsx` to place the logo right-justified (matching the Challenges page pattern), linking to the NAW infographic (`src/assets/naw-infographic-2026.png`) in a new tab.

The header becomes a flex row with the title + month nav on the left and the NAW logo on the right.

### Change 2 — Highlight NAW Week (April 26 – May 2) on Calendar

Add a hardcoded NAW date range constant. For each day cell that falls within April 26 – May 2, 2026, apply a distinct background highlight (e.g., `bg-red-700/15` with a subtle left border accent) and render a small "NAW" label in the cell so the week is visually distinct from regular tournament entries. Clicking the NAW label navigates to `/challenges`.

### Files Changed

| File | Change |
|------|--------|
| `src/assets/naw-calendar-logo-2026.png` | Copy uploaded logo |
| `src/pages/TournamentCalendar.tsx` | Add logo to header (right-justified, links to infographic); highlight April 26–May 2 cells with NAW badge linking to /challenges |

