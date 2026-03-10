

## Phase 1: Quest Database Tables & Backend

### Database Migration

Create 5 new tables mirroring the challenge tables, plus RLS policies and notification triggers:

**Tables:**
- `quests` — identical columns to `challenges`
- `quest_tasks` — identical to `challenge_tasks`, FK to `quests`
- `quest_enrollments` — identical to `challenge_enrollments`, FK to `quests`
- `quest_evidence` — identical to `challenge_evidence`, FK to `quest_enrollments`
- `quest_completions` — identical to `challenge_completions`, FK to `quests`

**RLS Policies** (mirroring challenge policies exactly):
- `quests`: anon read active, authenticated read active, moderators/admins full manage
- `quest_tasks`: anyone read (if quest active), moderators/admins manage
- `quest_enrollments`: users manage own, moderators/admins read all
- `quest_evidence`: users insert/view own, moderators review, delete own before submission
- `quest_completions`: users view own, moderators manage

**Triggers:**
- `notify_new_quest` — in-app notification to all users when a quest goes active (mirrors `notify_new_challenge`)
- `email_new_quest` — email notification (mirrors `email_new_challenge`)
- `update_updated_at` triggers on `quests` and `quest_enrollments`

**Notification preferences:** Add `new_quest` as a recognized notification type (works automatically via `should_notify` function).

### Edge Function Updates

**`send-notification-email/index.ts`**: Add a `new_quest` type handler (copy of `new_challenge` with "Quest" terminology).

**`ecosystem-data-api/index.ts`**: Add a `quests` action case querying the `quests` table (mirrors the `challenges` case).

### What This Does NOT Include (later phases)
- No frontend pages, components, or hooks yet
- No sidebar navigation changes
- No admin/moderator tab additions

