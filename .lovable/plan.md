
## Make page filters bright white and readable

### What’s causing it
The current filter UI is using theme colors intended for normal surfaces, not for text sitting directly on top of a busy dark/cyan background image.

- `src/components/ui/badge.tsx`
  - `outline` badges only use `text-foreground`
  - they do not add a stronger background, border glow, or white text treatment
- `src/pages/Challenges.tsx`
  - the game filter badges use `variant="outline"` with `text-foreground`
- `src/pages/Quests.tsx`
  - the game filter badges use the default badge styles, so inactive items still inherit the weaker outline text treatment
- `src/pages/Tournaments.tsx`
  - the filter controls use muted icon/text styling inside `SelectTrigger` / search UI, so they also read dim against the dark backdrop

### Why it looks grey
`text-foreground` in this theme is a soft off-white, and `muted-foreground` is intentionally grey. On top of the hex/cyber background, that combination loses contrast. The issue is not the data or filter logic — it is purely the visual styling.

### Implementation plan

1. **Create a stronger reusable filter appearance**
   - Update the filter chip styling so inactive filters are:
     - `text-white`
     - more visible border (`border-white/30` or theme-equivalent)
     - subtle dark/glass background (`bg-background/60` or `bg-card/70`)
   - Keep active filters more prominent with primary accent fill/glow

2. **Fix Challenges page filters**
   - In `src/pages/Challenges.tsx`, replace the current badge classes with a dedicated high-contrast filter-chip class set
   - Keep the existing filtering logic exactly as-is

3. **Fix Quests page filters**
   - Apply the same high-contrast chip treatment in `src/pages/Quests.tsx`
   - Also align section headings/progress labels with the stronger readable styling already expected on the Challenges page

4. **Improve Tournaments filter controls**
   - In `src/pages/Tournaments.tsx`, make the visible filter text/icons bright white where appropriate:
     - search icon
     - selected values in dropdown triggers
     - any muted labels in the filter row
   - Keep borders/backgrounds strong enough to separate controls from the page background

5. **Optional shared cleanup**
   - If the same chip pattern will be reused, extend `Badge` with a dedicated filter-friendly variant instead of repeating page-level classes
   - Otherwise, keep the fix page-local to avoid unintended global badge changes elsewhere in admin/tenant screens

### Files to update
- `src/pages/Challenges.tsx`
- `src/pages/Quests.tsx`
- `src/pages/Tournaments.tsx`
- possibly `src/components/ui/badge.tsx` if we make the filter style reusable

### Technical notes
- Avoid relying on plain `text-foreground` for chips over image-heavy headers/backgrounds
- Prefer a combination of:
  - `text-white`
  - semi-opaque dark background
  - visible border
  - optional `neon-text` only for headings, not small filter labels
- No backend or data changes are needed
