

# Challenges Overhaul: Work Order-Style with Evidence Tracking

## Current State
The existing challenges system is lightweight: moderators create a challenge (name, description, points, type, dates), and completions are recorded as a simple boolean by moderators. There is no mechanism for players to submit proof, no multi-step task tracking, no cover images, no difficulty/time metadata, and no game filtering on the player-facing page. The `challenges` table already has a `game_id` column but it is unused in the UI.

## What We Need (Inspired by FGN.academy Work Orders)

Based on the screenshot, the target experience includes:
- **Game-linked challenges** with cover images, filtered by game category
- **Difficulty levels** and estimated completion time
- **Multi-step tasks** (sub-objectives within a challenge)
- **Evidence submission** by players (screenshots/files proving task completion)
- **Enrollment** before starting (opt-in tracking)
- **Review workflow** where moderators verify submitted evidence

## Plan

### 1. Database Changes (3 migrations)

**Migration A -- Extend `challenges` table** with new columns:
- `cover_image_url` (text, nullable) -- hero image for the card
- `difficulty` (text, default `'beginner'`) -- beginner, intermediate, advanced
- `estimated_minutes` (integer, nullable) -- approximate time to complete
- `requires_evidence` (boolean, default `true`) -- whether players must upload proof
- `max_enrollments` (integer, nullable) -- optional cap

**Migration B -- Create `challenge_tasks` table** for multi-step objectives:
- `id`, `challenge_id` (FK to challenges), `title`, `description`, `display_order`, `created_at`
- RLS: anyone can view tasks for active challenges; moderators/admins can manage

**Migration C -- Create `challenge_enrollments` table** (players opt in):
- `id`, `challenge_id`, `user_id`, `enrolled_at`, `status` (enrolled/in_progress/submitted/completed/rejected)
- RLS: users can enroll themselves and view own; moderators can view all and update status

**Migration D -- Create `challenge_evidence` table** (proof uploads):
- `id`, `enrollment_id` (FK to challenge_enrollments), `task_id` (FK to challenge_tasks, nullable), `file_url`, `file_type`, `notes`, `submitted_at`
- RLS: users can insert/view own evidence; moderators can view all

### 2. Frontend Changes

**Player-Facing (`/challenges` page rewrite)**:
- Game filter tabs across the top (using existing games catalog)
- Card-based grid layout with cover images, game badge, difficulty, time estimate, enrollment count
- Challenge detail view (inline or dialog) showing: description, task checklist, enrollment button, evidence upload per task, submission status
- Evidence upload using existing `app-media` storage bucket
- Progress tracking per task within a challenge

**Moderator-Facing (`/moderator/challenges` expansion)**:
- Add fields to create dialog: cover image upload, difficulty select, estimated time, toggle for requires_evidence
- Task builder: add/reorder sub-tasks within a challenge
- Evidence review panel: view submitted evidence per enrollment, approve/reject with notes
- Enrollment list per challenge with status management

### 3. Storage
- Reuse existing `app-media` bucket for cover images and evidence uploads

### 4. File Summary

| Area | Files |
|------|-------|
| Database | 4 new migrations |
| Player UI | Rewrite `src/pages/Challenges.tsx`, new `src/components/challenges/ChallengeCard.tsx`, `ChallengeDetail.tsx`, `EvidenceUpload.tsx`, `TaskChecklist.tsx` |
| Moderator UI | Extend `src/pages/moderator/ModeratorChallenges.tsx`, new `src/components/challenges/TaskBuilder.tsx`, `EvidenceReviewPanel.tsx`, `EnrollmentList.tsx` |
| Hooks | New `src/hooks/useChallengeDetail.ts`, `src/hooks/useChallengeEnrollment.ts` |
| Routes | Add `/challenges/:id` route in `App.tsx` |

### 5. Scope Notes
- No changes to the points/season scoring system -- existing `challenge_completions` and point award logic remains, triggered when moderator approves evidence
- The existing AI description enhancer continues to work as-is
- Notifications for new challenges continue unchanged

