

## Per-Task Point Payouts for Quests

### Current Behavior
Points are awarded in a single lump sum when a moderator marks the entire quest enrollment as "completed." Individual task evidence approvals don't trigger any point awards.

### New Behavior
Each time a moderator **approves** a piece of task evidence, the player earns the quest's `points_first` value for that task. A quest with 5 tasks and `points_first = 1` awards 1 point per approved task = 5 total. The final "completed" status no longer awards points (they've already been earned per-task).

### Changes

**1. Database — New tracking table + trigger**

Create a `quest_task_point_awards` table to prevent double-awarding:

| Column | Type |
|---|---|
| id | uuid PK |
| enrollment_id | uuid |
| task_id | uuid |
| user_id | uuid |
| points_awarded | integer |
| awarded_at | timestamptz |

Unique constraint on `(enrollment_id, task_id)` to prevent duplicate payouts.

**2. Frontend — `AdminQuestsPanel.tsx` evidence approval mutation**

Update `updateEvidenceStatusMutation` (line 233): when `status = "approved"`, after updating the evidence row:
- Look up the quest's `points_first` value
- Check `quest_task_point_awards` to ensure this task hasn't already been paid
- Insert into `quest_task_point_awards`
- Call `award-season-points` edge function for the per-task amount
- Send a notification to the player: "Task approved! You earned X point(s)"

**3. Frontend — Quest completion mutation**

Update `updateStatusMutation` (line 143): when marking "completed," **skip** the `award-season-points` call since points were already awarded per-task. Still record `quest_completions` (for chain logic, XP, and achievement tracking).

**4. Quest Detail page — per-task status visibility**

The `QuestDetail.tsx` already shows per-evidence status badges. No changes needed — players already see which tasks are approved/pending/rejected.

**5. Sidebar points display**

Update the quest detail sidebar to show "Points per task" instead of a single total, so players understand the per-task payout model. Show `+{points_first} per task` and `{points_first × task_count} total possible`.

### Files Changed

| File | Change |
|---|---|
| New migration SQL | `quest_task_point_awards` table + RLS |
| `src/components/quests/AdminQuestsPanel.tsx` | Per-task point award on evidence approval; skip lump-sum on completion |
| `src/pages/QuestDetail.tsx` | Update sidebar to show per-task point breakdown |

## Standalone Player Guides with Media Upload — COMPLETED

Created three dedicated player guide pages with media upload support:

### Pages Created
- `/guide/tournaments` — Tournament Guide (9 sections)
- `/guide/challenges` — Challenge Guide (9 sections)
- `/guide/quests` — Quest Guide (8 sections, including per-task point payouts)

### Media System
- `guide_media` database table with public read / admin+moderator write RLS
- `useGuideMedia` hook for fetching and CRUD operations
- `GuideMediaManager` admin component in Admin Settings for uploading images, videos, and files per section
- All three guide pages render uploaded media inline within their accordion sections

### Cross-Links
- Player Guide sections link to the full standalone guides
