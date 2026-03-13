

## Plan: Transform "Featured Tournaments" into "Featured Events" (Tournaments + Challenges + Quests)

### Database Changes

Add `is_featured` boolean column to `challenges` and `quests` tables (tournaments already has it).

```sql
ALTER TABLE public.challenges ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.quests ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
```

No RLS changes needed — existing policies already cover read/write for these tables.

### UI Changes

#### 1. `src/components/FeaturedTournaments.tsx` → Rename to `src/components/FeaturedEvents.tsx`
- Rename component to `FeaturedEvents`
- Change heading from "Featured Tournaments" to "Featured Events"
- Change subtitle from "Compete Now" to "Don't Miss Out"
- Query all three tables for `is_featured = true` (no limit)
- Normalize each type into a unified card shape with a `type` field (tournament/challenge/quest)
- Cards link to appropriate detail pages (`/tournaments/:id`, `/challenges/:id`, `/quests/:id`)
- Add a type badge (Tournament/Challenge/Quest) on each card
- Remove the `.limit(3)` — show all featured items
- Replace "View all" link with `/tournaments` → something more generic or remove

#### 2. `src/pages/Index.tsx`
- Replace `FeaturedTournaments` import with `FeaturedEvents`

#### 3. Admin toggle buttons — add Star/Feature toggle to:
- **`src/pages/admin/AdminTournaments.tsx`** — already has `is_featured` in DB, just add Star toggle button in grid/list views
- **`src/pages/admin/AdminChallenges.tsx`** — add Star toggle button (new `is_featured` column)
- **`src/components/quests/AdminQuestsPanel.tsx`** — add Star toggle button (new `is_featured` column)
- Same toggles in moderator pages: `ModeratorTournaments.tsx`, `ModeratorChallenges.tsx`

Each toggle mutation:
```typescript
const toggleFeatured = useMutation({
  mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
    const { error } = await supabase
      .from("tournaments") // or "challenges" / "quests"
      .update({ is_featured: !current })
      .eq("id", id);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
    toast.success("Featured status updated");
  },
});
```

### Card Design for Featured Events

Each card shows:
- Type badge (Tournament / Challenge / Quest) with distinct colors
- Name + game
- Status badge
- Bottom stat row: Date + Players/Difficulty + Prize/Points (adapted per type)

### Files Modified
1. **Migration** — add `is_featured` to `challenges` and `quests`
2. `src/components/FeaturedTournaments.tsx` → rewrite as `src/components/FeaturedEvents.tsx`
3. `src/pages/Index.tsx` — update import
4. `src/pages/admin/AdminTournaments.tsx` — add Star toggle
5. `src/pages/admin/AdminChallenges.tsx` — add Star toggle
6. `src/components/quests/AdminQuestsPanel.tsx` — add Star toggle
7. `src/pages/moderator/ModeratorTournaments.tsx` — add Star toggle
8. `src/pages/moderator/ModeratorChallenges.tsx` — add Star toggle

