

## Add Display Order + Drag-and-Drop Reorder to Admin Challenges

### Problem
Challenges are sorted by `created_at desc` with no `display_order` column, so there's no way to reorder them. The user wants to move 6 FS25 Farm challenges between specific CDL/ATS challenges.

### Changes

**1. Database migration** — Add `display_order` column to `challenges`
```sql
ALTER TABLE public.challenges ADD COLUMN display_order integer DEFAULT 0;
-- Backfill based on current created_at ordering
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.challenges
)
UPDATE public.challenges SET display_order = ranked.rn FROM ranked WHERE challenges.id = ranked.id;
```

**2. `src/pages/admin/AdminChallenges.tsx`**
- Change query ordering from `created_at desc` → `display_order asc`
- Add drag-and-drop reordering using `@dnd-kit` (same pattern as AdminGames)
- Add grip handles to grid cards and list rows
- Add a reorder mutation that batch-updates `display_order` values
- Disable drag when a column sort or filter is active

**3. Immediate reorder** — After the migration runs, the 6 FS25 Farm challenges will have sequential `display_order` values. Once drag-and-drop is live, you can drag them into position between "FS25 CDL: Bulk Grain Haul" and "ATS Skills: Hazard and Emergency Response."

### Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `display_order` column + backfill |
| `src/pages/admin/AdminChallenges.tsx` | Add DnD reorder (following AdminGames pattern), change sort to `display_order` |

### Technical Notes
- Uses the same `@dnd-kit/core` + `@dnd-kit/sortable` already installed for AdminGames
- Drag is disabled when filters or column sorting are active (same UX as Games page)
- After implementation, you'll drag the 6 Farm challenges to the desired position

