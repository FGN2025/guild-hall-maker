

## Plan: Link Achievements (Badges/Trophies) to Tournaments, Challenges & Quests

### Summary
Add an optional `achievement_id` field to **tournaments**, **challenges**, and **quests** tables so admins/moderators can assign a badge or trophy that players earn upon completion — in addition to points. Update all create/edit dialogs to include an achievement picker dropdown, and ensure the media library categories include "badge" and "trophy" on the player-facing page.

### Database Changes (3 migrations)

Add a nullable `achievement_id` column with a foreign key to `achievement_definitions` on each table:

```sql
ALTER TABLE public.tournaments
  ADD COLUMN achievement_id uuid REFERENCES public.achievement_definitions(id) ON DELETE SET NULL;

ALTER TABLE public.challenges
  ADD COLUMN achievement_id uuid REFERENCES public.achievement_definitions(id) ON DELETE SET NULL;

ALTER TABLE public.quests
  ADD COLUMN achievement_id uuid REFERENCES public.achievement_definitions(id) ON DELETE SET NULL;
```

No RLS changes needed — these tables already have appropriate policies.

### UI Changes

**1. Achievement Picker Component** (new shared component)
- `src/components/shared/AchievementPicker.tsx` — a `<Select>` dropdown that fetches `achievement_definitions` and lets admins pick a badge/trophy to link. Shows tier + name. "None" option to clear.

**2. Tournament Create/Edit Dialogs** (~2 files)
- `CreateTournamentDialog.tsx` — add `achievement_id` to form state and Props interface; render `<AchievementPicker>` in the form
- `EditTournamentDialog.tsx` — same; pre-populate from existing tournament data

**3. Challenge Create/Edit Dialogs** (~2 files)
- `CreateChallengeDialog.tsx` — add `achievement_id` to form and mutation payload
- `EditChallengeDialog.tsx` — same with pre-population

**4. Quest Create/Edit Dialogs** (~2 files)
- `CreateQuestDialog.tsx` — add `achievement_id` to form and mutation payload
- `EditQuestDialog.tsx` — same with pre-population

**5. Player-Facing Media Library Categories**
- `src/pages/MediaLibrary.tsx` — update `TABS` to include `"badge"` and `"trophy"` (the admin media library already has them)

**6. Auto-Award on Completion** (enhancement to existing triggers/functions)
- Update the `award-season-points` edge function (or add a new database trigger) so that when a challenge enrollment is marked `completed`, quest completion is recorded, or a tournament winner is determined, the system checks if an `achievement_id` is linked and auto-awards it via an insert into `player_achievements`. This ensures the badge is granted alongside points without manual moderator action.

### Files Modified
| File | Change |
|------|--------|
| **Migration SQL** | Add `achievement_id` column to 3 tables |
| `src/components/shared/AchievementPicker.tsx` | New shared component |
| `src/components/tournaments/CreateTournamentDialog.tsx` | Add picker + pass field |
| `src/components/tournaments/EditTournamentDialog.tsx` | Add picker + pre-populate |
| `src/components/challenges/CreateChallengeDialog.tsx` | Add picker + pass field |
| `src/components/challenges/EditChallengeDialog.tsx` | Add picker + pre-populate |
| `src/components/quests/CreateQuestDialog.tsx` | Add picker + pass field |
| `src/components/quests/EditQuestDialog.tsx` | Add picker + pre-populate |
| `src/pages/MediaLibrary.tsx` | Add badge/trophy tabs |
| `supabase/functions/award-season-points/index.ts` | Auto-award linked achievement |

### Existing Patterns Leveraged
- `quest_chains` already has `bonus_achievement_id` — same pattern applied to the three main competition tables
- `useAchievementDefinitions()` hook already exists for fetching definitions
- `player_achievements` upsert pattern already exists in `useAchievementAdmin`
- Admin media library already has badge/trophy categories — just mirroring to the player-facing page

