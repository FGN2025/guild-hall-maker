# Fold Quests into Challenges as "Competitive Gaming"

Quests disappear as a concept. Their 8 items become real challenges, grouped under a single new **Competitive Gaming** card on the Challenges page, and managed from the one Challenges admin area.

## What exists today

- 8 quests, all active, all standalone (no chains exist at all), each with 5 tasks.
- 29 enrollments, 1 completion, 23 pieces of uploaded evidence, 1 task point award.
- Quest XP is unused: every quest is worth 0 XP and no player has any XP recorded.

## What you will see

- The sidebar loses **Quests**. Challenges stays.
- On the Challenges page, alongside the game-community cards, a **Competitive Gaming** card appears. Opening it shows all 8 converted items (American Truck Simulator, Fortnite, Mario Kart World, Marvel Rivals, Pokémon Legends: Z-A, Rocket League, Super Smash Bros Ultimate, Valorant) as normal challenge cards.
- Players keep their enrollments, completions, submitted evidence and awarded points — nothing resets.
- Detail pages, enrolling, uploading evidence and review all work through the existing challenge screens.
- Admins manage these from **Challenges** only; the separate Quests admin page is gone and its address redirects to Challenges.
- Old quest links (`/quests`, `/quests/:id`) redirect to the new challenge equivalents.
- The words "quest" and "XP rank" no longer appear anywhere in the player or admin interface.

## Carry-overs

- **Series (formerly chains):** the grouping capability is preserved on challenges so multi-step sequences with intro/outro story text and a bonus can still be built, but since no chains exist today nothing is migrated into it.
- **XP:** the XP field and rank display carry over to challenges under neutral wording. Values are all zero today, so no player-visible number changes.

## Technical details

**Migration (additive only, no drops):**
- Add nullable columns to `challenges`: `track` (text, set to `competitive_gaming` for migrated rows), `xp_reward` (int default 0), `series_id`, `series_order`, `story_intro`, `story_outro`.
- New `challenge_series` table mirroring `quest_chains`, with GRANTs, RLS and policies matching the challenge pattern; `challenge_series_completions` mirroring `quest_chain_completions`.
- New `challenge_task_point_awards` mirroring `quest_task_point_awards` (grants + RLS + policies).
- New `player_challenge_xp` mirroring `player_quest_xp`.
- Backfill in the same migration, preserving original UUIDs so foreign keys line up: `quests` → `challenges`, `quest_tasks` → `challenge_tasks`, `quest_enrollments` → `challenge_enrollments`, `quest_completions` → `challenge_completions`, `quest_evidence` → `challenge_evidence`, `quest_task_point_awards` → `challenge_task_point_awards`. All inserts use `ON CONFLICT DO NOTHING`.
- Quest tables are left in place (not dropped) so nothing in flight breaks; code stops reading them.

**Frontend:**
- `ChallengesHub.tsx`: render a fixed Competitive Gaming tile (count from `track='competitive_gaming'`) above the per-game category sections, linking to `/challenges/track/competitive-gaming`.
- New `src/pages/CompetitiveGaming.tsx` reusing `ChallengeCard`, the difficulty filter and the same hero/return-button pattern as `GameChallenges.tsx`.
- `useChallengeHub.ts`: exclude `track='competitive_gaming'` rows from the per-game grouping so they only appear in their own card.
- Delete `src/pages/Quests.tsx`, `QuestDetail.tsx`, `src/pages/admin/AdminQuests.tsx`, `src/pages/guides/QuestGuide.tsx`, quest components and quest hooks; remove sidebar/nav entries.
- `App.tsx`: redirect `/quests` → `/challenges/track/competitive-gaming`, `/quests/:id` → `/challenges/:id`, `/admin/quests` → `/admin/challenges`.
- Admin: fold quest creation/editing into the existing challenge dialogs, with a Competitive Gaming option on the challenge form; remove `AdminQuestsPanel`.
- Update dashboard, player profile, achievements and guide copy that references quests to the challenge wording.

**Verification:** row counts before/after for each migrated table; type-check; browser pass over `/challenges`, the Competitive Gaming page, one detail page, and `/admin/challenges`.
