

## Make Filters and Section Titles More Visible

### Problem
The "Available Challenges" / "Completed" section headings and the game filter badges use muted/grey text that blends into the dark background, making them hard to read.

### Changes

**File: `src/pages/Challenges.tsx`**

1. **Section headings** — Change "Available Challenges" and "Completed" `h2` elements from `text-foreground` to `text-white` with added `text-xl` for better visibility
2. **Game filter badges** — Add `text-white` to the outline-variant badges so unselected filters are bright white instead of grey
3. **"Overall Progress" label** — Change from `text-muted-foreground` to `text-white` to match

These are purely cosmetic text color changes — no logic or structural modifications.

