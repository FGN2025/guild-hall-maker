

## Plan: Unify Admin Card Action Buttons Across Tournaments, Challenges, and Quests

### Current State (Grid View)

```text
Tournaments:  [Manage] [Promo] [Delete]
Challenges:   [Edit]   [View]  [Promo]  [Delete]
Quests:       [Edit]   [View]           [Delete]
```

### Target State

All three should show the same four buttons in the same order:

```text
[Edit] [View] [Promo] ... [Delete]
```

### Level of Effort: Low

Three small edits, all in the action button rows of grid cards. No new components, no logic changes, no database work.

### Changes

#### 1. `src/pages/admin/AdminTournaments.tsx` (Grid actions, ~lines 292-313)
- Rename "Manage" to "Edit" (keep same navigate to `/manage`)
- Add a "View" button that navigates to `/tournaments/${t.id}` (the player-facing detail page)
- Keep "Promo" and "Delete" as-is
- Also update the **list view** actions (~lines 216-234) to include a View icon button navigating to `/tournaments/${t.id}`

#### 2. `src/components/quests/AdminQuestsPanel.tsx` (Grid actions, ~lines 422-426)
- Add a "Promo" button between "View" and "Delete"
- Import `Megaphone` icon and the `EventPromoEditorDialog` / promo builder (same pattern as challenges)
- Add `promoData` state and the `EventPromoEditorDialog` render
- Need to create a `buildQuestPromo` helper or reuse `buildChallengePromo` from `EventPromoEditor`
- Also add Promo to the **list view** actions

#### 3. `src/components/marketing/EventPromoEditor.tsx`
- Add a `buildQuestPromo` export function (mirroring `buildChallengePromo`) so quests can generate promo data

### Files Modified
1. `src/pages/admin/AdminTournaments.tsx` — rename Manage to Edit, add View button
2. `src/components/quests/AdminQuestsPanel.tsx` — add Promo button + state + dialog
3. `src/components/marketing/EventPromoEditor.tsx` — add `buildQuestPromo` helper

