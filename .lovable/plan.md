
User confirmed: bulk realign stays as an explicit admin action (no auto-run post-deploy). Default enforcement mode = **Suggest** (warn-only). Proceeding with the plan as previously outlined, with this explicit confirmation baked in.

## Points Standardization & Central Rubric — Implementation Plan

### Rubric (admin-editable defaults)
```text
CHALLENGES & QUESTS (same rubric, parity)
              Beginner  Intermediate  Advanced
  Daily          5           8           12
  Weekly        10          15           25
  Monthly       20          35           50
  One-Time      15          25           40

TOURNAMENTS (per-match participation)
  Beginner 3 | Intermediate 5 | Advanced 8
  Placement multipliers: 1st ×5, 2nd ×3, 3rd ×2

QUEST CHAINS  bonus = sum(quest points) × 0.25
PRIZES        Common 50–150 | Rare 200–400 | Epic 500–800 | Legendary 1000+
```

### Architecture
1. **Central config** in `app_settings` under key `points_rubric_config` (JSON, versioned). Includes `enforcement: "suggest"` by default.
2. **Per-item override** — new nullable columns on `challenges`, `quests`, `tournaments`: `points_override_reason text`, `points_overridden_by uuid`. Items with these set are skipped by realign.
3. **Realign log** — new `points_realignment_log` table records every batch diff for audit.
4. **Difficulty normalization** — migration lowercases all existing `difficulty` values; add validation trigger to enforce lowercase on insert/update.

### Build steps
1. **Migration** — schema additions + difficulty normalization + seed default rubric row.
2. **`src/lib/pointsRubric.ts`** — `getRecommendedPoints()`, `validatePoints()` helpers.
3. **`src/hooks/usePointsRubric.ts`** — React Query hook (10-min staleTime).
4. **`src/components/shared/PointsInput.tsx`** — shared input showing recommended value, "Use recommended" button, override toggle + required reason (admin-only), inline warning if deviation > 25%.
5. **`src/pages/admin/AdminPointsRubric.tsx`** — matrix editor, enforcement-mode selector, live audit panel ("X items off-rubric"), explicit **Realign** button (no auto-run), override log viewer.
6. **Sidebar + route** — add link in `AdminSidebar.tsx`, register route in `App.tsx`.
7. **Wire `PointsInput`** into:
   - `CreateChallengeDialog`, `EditChallengeDialog`
   - `CreateQuestDialog`, `EditQuestDialog`
   - `CreateTournamentDialog`, `EditTournamentDialog` (participation + placement fields)
8. **Edge function** `align-points-to-rubric` — admin-only (JWT-validated), iterates non-overridden items, applies rubric, logs diffs to `points_realignment_log`. Triggered manually from the admin page.
9. **Prize editor** — surface suggested cost band based on rarity in `PrizeFormDialog.tsx` (warning only).

### Files
**New:** `src/lib/pointsRubric.ts`, `src/hooks/usePointsRubric.ts`, `src/components/shared/PointsInput.tsx`, `src/pages/admin/AdminPointsRubric.tsx`, `supabase/functions/align-points-to-rubric/index.ts`, migration SQL.

**Modified:** `src/components/admin/AdminSidebar.tsx`, `src/App.tsx`, 6 create/edit dialogs (challenges/quests/tournaments), `src/components/moderator/PrizeFormDialog.tsx`.

### Behavior guarantees
- **Nothing changes automatically** — existing items keep their current points until you click Realign.
- **Suggest mode** = warnings only; admins can save any value.
- **Realign skips overridden items** — your manual decisions are preserved.
- **Full audit trail** in `points_realignment_log` so we can review before any further action.

### QA checklist (post-build)
1. Open `/admin/points-rubric` → verify matrix loads with seeded defaults.
2. Create one challenge under each difficulty → confirm recommended value auto-fills + warning on deviation.
3. Toggle override + save with reason → confirm record persists with `points_overridden_by`.
4. Run audit panel → review off-rubric counts before clicking Realign.
5. Click Realign on a small subset → verify `points_realignment_log` entries + skipped overrides.
