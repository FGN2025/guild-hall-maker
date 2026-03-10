

## Phase 4: Quest Differentiation Features

This phase adds four features that distinguish Quests from Challenges: quest chains, XP progression, storyline narratives, and chain completion bonuses.

### 1. Database Changes (Single Migration)

**New table: `quest_chains`**
Defines a named sequence of quests with a storyline arc.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text NOT NULL | e.g. "CDL Trucker Path" |
| description | text | Overall chain description |
| story_intro | text | Narrative shown at chain start |
| story_outro | text | Narrative shown on chain completion |
| cover_image_url | text | |
| bonus_points | int DEFAULT 0 | Points awarded on full chain completion |
| bonus_achievement_id | uuid nullable FK → achievement_definitions | Optional badge awarded |
| display_order | int DEFAULT 0 | Ordering on the Quests page |
| is_active | bool DEFAULT true | |
| created_by | uuid NOT NULL | |
| created_at / updated_at | timestamptz | |

RLS: anon/authenticated SELECT where active; moderators/admins ALL.

**New columns on `quests` table:**
- `chain_id` uuid nullable FK → quest_chains
- `chain_order` int DEFAULT 0 (position within chain)
- `story_intro` text (quest-specific story text shown on enrollment)
- `story_outro` text (shown on completion)
- `xp_reward` int DEFAULT 0 (XP earned on completion, separate from season points)

**New table: `player_quest_xp`**
Tracks cumulative quest XP per player.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid NOT NULL UNIQUE | |
| total_xp | int DEFAULT 0 | |
| quest_rank | text DEFAULT 'novice' | Computed label |
| updated_at | timestamptz | |

RLS: users SELECT own; moderators/admins SELECT all; system updates via trigger.

**New table: `quest_chain_completions`**
Records when a player finishes all quests in a chain.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid NOT NULL | |
| chain_id | uuid NOT NULL FK → quest_chains | |
| bonus_points_awarded | int DEFAULT 0 | |
| completed_at | timestamptz | |
| UNIQUE(user_id, chain_id) | | |

RLS: users SELECT own; moderators/admins manage.

**Database trigger: `trg_quest_xp_on_completion`**
On INSERT into `quest_completions`: look up `xp_reward` from `quests`, upsert into `player_quest_xp`, and recompute `quest_rank` based on thresholds (0-99 Novice, 100-299 Apprentice, 300-599 Journeyman, 600-999 Expert, 1000+ Master).

**Database function: `check_quest_chain_complete`**
Called after quest completion. If all quests in the chain are completed by this user, insert into `quest_chain_completions` and award bonus points to `season_scores`.

### 2. Quest Chain Unlock Logic

A quest with `chain_id` and `chain_order > 0` is locked until the previous quest in the chain (same `chain_id`, `chain_order = current - 1`) has a row in `quest_completions` for that user. This is enforced client-side in the UI (greyed-out card with lock icon + "Complete X first" tooltip). The enrollment RLS doesn't need changes since we validate in the frontend before allowing enrollment.

### 3. Frontend Changes

**Hooks:**
- `useQuestChains` — fetches `quest_chains` with nested quests, ordered by `display_order` then `chain_order`
- Update `useQuestDetail` — include `chain_id`, `chain_order`, `story_intro`, `story_outro`, `xp_reward`, and chain info
- `usePlayerQuestXP` — fetches current user's XP total and rank

**Quests Page (`src/pages/Quests.tsx`):**
- Add a "Quest Chains" section above individual quests showing chain cards with progress bars
- Each chain card shows: name, story_intro preview, X/Y quests completed, bonus points available
- Clicking a chain expands/navigates to show the sequential quest list with lock/unlock states
- Add an XP/Rank badge in the stats row (e.g. "Journeyman — 450 XP")

**Quest Detail (`src/pages/QuestDetail.tsx`):**
- Show `story_intro` in a styled narrative card above the description (italic, border-left accent)
- Show `story_outro` after completion status
- Show XP reward alongside points in the sidebar
- If part of a chain: show chain breadcrumb ("Chain: CDL Trucker Path — Quest 2 of 5") with prev/next navigation
- If locked: show lock overlay with "Complete [previous quest name] first"

**Quest Card (`src/components/quests/QuestCard.tsx`):**
- Add chain badge and position indicator (e.g. "2/5")
- Add lock overlay for locked quests
- Show XP reward

**Admin — Create/Edit Quest Dialogs:**
- Add chain selector dropdown (or "No chain")
- Add chain_order input (auto-suggested as next in sequence)
- Add story_intro and story_outro textareas
- Add xp_reward input

**Admin — New "Quest Chains" management tab:**
- Add a third tab "Chains" to the AdminQuestsPanel
- CRUD for quest_chains with name, description, story_intro/outro, cover image, bonus points, optional achievement link
- Visual list of quests in each chain with drag-to-reorder (using existing dnd-kit)

**XP Rank Display:**
- Add rank badge component showing current rank + XP progress bar to next rank
- Display on Quests page header and player profile

### 4. XP Rank Thresholds

```text
Novice:      0 – 99 XP
Apprentice:  100 – 299 XP
Journeyman:  300 – 599 XP
Expert:      600 – 999 XP
Master:      1000+ XP
```

### 5. Files to Create/Edit

**Create:**
- `src/hooks/useQuestChains.ts`
- `src/hooks/usePlayerQuestXP.ts`
- `src/components/quests/QuestChainCard.tsx`
- `src/components/quests/QuestRankBadge.tsx`
- `src/components/quests/StoryNarrative.tsx`
- `src/components/quests/ChainBreadcrumb.tsx`
- `src/components/quests/AdminChainsTab.tsx`

**Edit:**
- `src/pages/Quests.tsx` — add chains section, XP display
- `src/pages/QuestDetail.tsx` — add story, chain nav, lock state, XP
- `src/components/quests/QuestCard.tsx` — chain badge, lock, XP
- `src/components/quests/CreateQuestDialog.tsx` — chain/story/XP fields
- `src/components/quests/EditQuestDialog.tsx` — chain/story/XP fields
- `src/components/quests/AdminQuestsPanel.tsx` — add Chains tab
- `src/hooks/useQuestDetail.ts` — include new columns

**No edge function changes needed** — all logic handled via database triggers and client queries.

### Implementation Order
1. Database migration (tables, columns, triggers, functions)
2. Hooks (`useQuestChains`, `usePlayerQuestXP`, updated `useQuestDetail`)
3. Admin chain management (AdminChainsTab, create/edit dialog updates)
4. Player-facing UI (chain cards, lock states, story narratives, XP rank badge)

