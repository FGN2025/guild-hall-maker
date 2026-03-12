

## Replace Multi-Tier Points with Single "Quest Points" Field

Quests currently share the same 4-tier points structure as Challenges/Tournaments (1st, 2nd, 3rd, Other). Since quests are non-competitive (everyone who completes earns the same reward), this should be simplified to a single "Quest Points" value.

### Approach

Use the existing `points_first` column as the single quest points value (renamed in the UI only — no DB migration needed). Remove references to `points_second`, `points_third`, and `points_participation` from quest-specific UI only. Challenges and Tournaments keep their 4-tier structure unchanged.

### Files to Modify

**1. `src/components/quests/EditQuestDialog.tsx`**
- Remove `pointsSecond`, `pointsThird`, `pointsParticipation` state variables
- Remove them from the `useEffect` hydration and the `update` mutation payload
- Replace the 4-column points grid with a single "Quest Points" input bound to `pointsFirst`

**2. `src/components/quests/CreateQuestDialog.tsx`**
- Remove `points_second`, `points_third`, `points_participation` from `defaultForm`
- Stop sending them in the insert mutation (or send 0)
- Replace the 4-column points grid with a single "Quest Points" input

**3. `src/components/quests/AdminQuestsPanel.tsx`**
- Change the card stat from "1st Pts" → "Quest Pts"
- Change the detail panel stat from "1st Place Pts" → "Quest Pts"
- Remove the 4-column "Points Breakdown" grid in the detail panel; show single value instead

**4. `src/components/quests/QuestCard.tsx`**
- Label already shows `+{q.points_first} pts` — no change needed (already correct)

**5. `src/pages/QuestDetail.tsx`**
- Label already shows `+{q.points_first}` as "Points" — no change needed

No database migration required. The `points_first` column stores the quest points value; the other columns simply won't be used for quests going forward.

