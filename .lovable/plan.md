

## Challenge ↔ Quest Copy Feature

### Overview
Add a "Copy to Quest" button on Challenge detail pages and a "Copy to Challenge" button on Quest detail pages (visible to admins/moderators only). Clicking copies the shared fields and tasks into the target type, inserting as `is_active: false` for review before publishing.

### Field Mapping

```text
Challenge → Quest
─────────────────
name, description, difficulty, game_id     → 1:1 copy
points_first / points_reward               → points_first + points_reward
estimated_minutes, requires_evidence       → 1:1 copy
cover_image_url, achievement_id            → 1:1 copy
challenge_type                             → "one_time"
cdl_domain, cfr_reference, coach_context   → dropped (quest has no CDL fields)
chain_id, chain_order, story_intro/outro   → null (no chain assignment)
xp_reward                                  → 0
is_active                                  → false

Quest → Challenge
─────────────────
Same shared fields copied 1:1
chain_id, chain_order, story fields, xp    → dropped
challenge_type                             → "one_time"
is_active                                  → false
```

Tasks copy directly: `title`, `description`, `display_order` map 1:1 between `challenge_tasks` and `quest_tasks`.

### Implementation

**1. New hook: `src/hooks/useCopyContent.ts`**
- `copyChallenge ToQuest(challengeId)` — reads challenge + tasks, inserts into `quests` + `quest_tasks`, navigates to new quest detail page
- `copyQuestToChallenge(questId)` — reads quest + tasks, inserts into `challenges` + `challenge_tasks`, navigates to new challenge detail page
- Both append " (Copy)" to the name to avoid confusion
- Returns `{ copying, copyToQuest, copyToChallenge }` with loading state

**2. ChallengeDetail.tsx (~line 158, admin action bar)**
- Add "Copy to Quest" button with `Copy` icon between Edit and Delete
- Wired to `copyToQuest` mutation → on success, toast + navigate to `/quests/{newId}`

**3. QuestDetail.tsx (~line 154, admin action bar)**  
- Add "Copy to Challenge" button with `Copy` icon between Edit and Delete
- Wired to `copyToChallenge` mutation → on success, toast + navigate to `/challenges/{newId}`

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useCopyContent.ts` | New — shared copy mutations |
| `src/pages/ChallengeDetail.tsx` | Add "Copy to Quest" button in admin bar |
| `src/pages/QuestDetail.tsx` | Add "Copy to Challenge" button in admin bar |

No database or schema changes needed.

