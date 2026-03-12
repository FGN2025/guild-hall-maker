

## Plan: Enhance Challenge Description AI with Richer Context

### Problem
1. The edge function only receives `name`, `description`, and `challenge_type` — missing game info, tasks, difficulty, cover image context
2. The "Enhance with AI" button only exists on **CreateChallengeDialog** — missing from **EditChallengeDialog**

### Changes

#### 1. Update Edge Function (`supabase/functions/enhance-challenge-description/index.ts`)
- Accept additional fields: `game_name`, `difficulty`, `estimated_minutes`, `tasks` (array of task titles), `cover_image_url`
- Build a richer prompt that includes game context, difficulty level, task objectives, and image description cues
- If `game_name` is provided, fetch the game's `guide_content` from the database for domain-specific language
- Keep the system prompt gaming-focused but instruct the model to reference specific tasks and game mechanics

#### 2. Update CreateChallengeDialog
- Pass additional context to the edge function call: `game_name` (resolved from `selectedGameId`), `difficulty`, `estimated_minutes`, `tasks` (mapped to titles), `cover_image_url` (from `imagePreview`)

#### 3. Add "Enhance with AI" to EditChallengeDialog
- Import `Sparkles` icon, add `enhancing` state
- Add the same enhance button below the Description textarea
- Pass full context: `name`, `description`, `challenge_type`, `game_name` (from `gameId` + games list), `difficulty`, `estimated_minutes`, `tasks` (from `localTasks` titles), `cover_image_url`

### Edge Function Prompt Enhancement

The user prompt will be structured as:
```
Challenge: "{name}"
Type: {challenge_type} | Difficulty: {difficulty} | Est. {estimated_minutes} min
Game: {game_name}
Tasks: 1) {task1} 2) {task2} ...
Game Guide Context: {guide_content excerpt}
{draft description or "generate from scratch"}
```

The system prompt will instruct the AI to craft a description that references the specific tasks/objectives and incorporates game-specific terminology from the guide content.

### Files Modified
- `supabase/functions/enhance-challenge-description/index.ts` — richer prompt with game lookup
- `src/components/challenges/CreateChallengeDialog.tsx` — pass more context fields
- `src/components/challenges/EditChallengeDialog.tsx` — add Enhance with AI button + logic

