## Finish Steam Verification Integration

Three remaining items from the previous turn.

### 1. Confirm EditChallengeDialog fix
The stray `/>` was already removed (lines 477–483 now show a clean `TaskVerificationEditor` block). No further change needed; build should pass.

### 2. Wire `TaskVerificationEditor` into `CreateChallengeDialog`
Mirror the EditChallengeDialog approach so newly-created challenges can also configure Steam-based auto-verification per task.

Changes to `src/components/challenges/CreateChallengeDialog.tsx`:
- Extend the local task shape from `{ title, description }` to also include:
  - `verification_type: "manual" | "steam_achievement" | "steam_playtime"` (default `"manual"`)
  - `steam_achievement_api_name: string | null`
  - `steam_playtime_minutes: number | null`
- Look up the selected game's `steam_app_id` from the existing `games` query (extend the select to include `steam_app_id`).
- Render `<TaskVerificationEditor>` inside each task row, passing the game's `steamAppId` and the per-task fields, with an `onChange` that updates that task entry.
- In `createMutation`, include the three new columns when inserting into `challenge_tasks`.
- Reset the new fields in `defaultForm` / `addTask`.

### 3. Steam icon on `TaskChecklist`
Show a small Steam-style indicator next to tasks that have automated Steam verification configured, so players know they can use the "Check Steam now" flow.

Changes to `src/components/challenges/TaskChecklist.tsx`:
- Extend the `Task` interface with optional `verification_type`, `steam_achievement_api_name`, `steam_playtime_minutes`.
- When `verification_type` is `"steam_achievement"` or `"steam_playtime"`, render a `Gamepad2` icon (lucide) with a tooltip / title like `"Auto-verified via Steam"` next to the task title.
- Use semantic tokens (`text-primary` / `text-accent`) — no hardcoded colors.
- Update the `useChallengeDetail` hook's task select (if not already) to return the new columns so they reach this component. (Verify first; if already returned, no change.)

### Out of scope
- No DB migrations (already applied last turn).
- No edge function changes.
- No changes to admin task list UIs beyond the create dialog.

### Verification
- Build passes (no TS errors).
- Open Create Challenge dialog with a Steam game selected → verification editor appears per task.
- Open a challenge detail page where a task has Steam verification → gamepad icon shows next to that task.
