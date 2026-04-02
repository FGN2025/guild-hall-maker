

## Fix Filter Badge and Section Heading Visibility

### Root Cause
The badges use `text-white bg-card/70 border-white/30` but `bg-card` in this dark theme is very close to the background, and at 70% opacity it's nearly invisible. The `border-white/30` (white at 30% opacity) is too faint. The section headings ("Available Quests", "Available Challenges") use `text-white` but without the `neon-text` glow they blend in.

### Fix

**1. Wrap filter badges in a frosted-glass container** so they sit on a visually distinct surface:
- Add a wrapper `div` with `rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 p-3` around the badge row on both pages
- This creates a dark translucent panel that lifts the filters off the busy background

**2. Strengthen individual badge styling**:
- Inactive badges: `text-white bg-white/10 border border-white/40 hover:bg-white/20` (white text on a lightly frosted white-tinted chip with a visible white border)
- Active badge (selected): keep `variant="default"` which uses the primary cyan fill

**3. Add `neon-text` to section headings on Quests page** to match Challenges page:
- "Quest Chains" h2: add `text-white neon-text`
- "Available Quests" h2: add `neon-text`
- "Completed" h2: add `neon-text`

### Files to update

| File | Change |
|------|--------|
| `src/pages/Challenges.tsx` | Wrap filter row in frosted container; update inactive badge classes to `text-white bg-white/10 border border-white/40 hover:bg-white/20` |
| `src/pages/Quests.tsx` | Same filter wrapper and badge treatment; add `neon-text` to section headings |

### Key difference from previous attempt
Instead of relying on `bg-card/70` (which is nearly the same dark color as the page background), using `bg-white/10` for badges and `bg-black/40 backdrop-blur-sm` for the container creates actual visible contrast through light-on-dark layering.

