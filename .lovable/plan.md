

## Plan: Add "Enhance with AI" Button to Quest Description Fields

### Problem
Quest dialogs have the Enhance button for Story Intro/Outro but not for the Description field. Challenges have this — quests should match.

### Changes

#### 1. `src/components/quests/EditQuestDialog.tsx`
- Replace the plain Description `<div>` (lines 206-209) with a version that includes an "Enhance with AI" button below the textarea
- Reuse the existing `enhance-challenge-description` edge function (same one challenges use), passing quest context: `name`, `description`, `challenge_type`, `game_name`, `difficulty`, `estimated_minutes`, `tasks` (fetched from DB), `cover_image_url`
- Add an `enhancingDesc` state to track loading independently from the narrative enhance states
- Disable textarea while enhancing

#### 2. `src/components/quests/CreateQuestDialog.tsx`
- Add the same "Enhance with AI" button below the Description textarea (after line 210)
- Pass context from form state: `name`, `description`, `challenge_type`, `game_name` (resolved from `selectedGameId`), `difficulty`, `estimated_minutes`, `tasks` (from `form.tasks`), `cover_image_url` (from `imagePreview`)
- Add `enhancingDesc` state

Both will invoke `enhance-challenge-description` (not `enhance-quest-narrative`) since that function is already designed for description enhancement with full context support.

