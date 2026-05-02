# Steam-Powered Challenge Task Auto-Approval

## What exists today

- `profiles.steam_id` + `steam_username` populated via `steam-openid-callback` (OpenID flow already live).
- `games.steam_app_id` (nullable) — used by Steam launch link in `GameDetail` and the achievement admin picker.
- `steam_player_achievements` table: per-user, per-app, per-achievement rows (`achieved`, `unlock_time`, `synced_at`).
- `steam-achievement-sync` edge function: pulls `GetPlayerAchievements` for every game with a `steam_app_id`, 5-min cooldown, handles private profiles.
- `usePlayerAchievements` already evaluates `auto_criteria.type === 'steam_achievement'` against synced rows for the global achievement system.
- `challenge_tasks` is currently very thin: `id, challenge_id, title, description, display_order`. No verification metadata.
- Evidence flow (`EvidenceUpload` + `challenge_evidence`) is fully manual: image/video upload or URL → moderator approves.

## Goal

For challenge tasks tied to a Steam-enabled game, auto-detect completion from the player's Steam log (achievements unlocked and/or playtime) and auto-approve the evidence record. If the game has no `steam_app_id` or the user hasn't linked Steam, fall back to today's manual upload + moderator review.

## Scope of changes

### 1. Make `steam_app_id` mandatory for new Steam-category games
- `AddGameDialog`: when a "Steam" platform/category is selected, require `steam_app_id` (client validation + clear helper text). Existing rows untouched (no backfill, no DB constraint — would break legacy non-Steam games).
- Surface a warning badge in `AdminGames` for any Steam game missing the ID.

### 2. Add verification metadata to `challenge_tasks` (migration)
New nullable columns:
- `verification_type` text — `'manual' | 'steam_achievement' | 'steam_playtime'` (default `'manual'`).
- `steam_achievement_api_name` text — required when type = `steam_achievement`.
- `steam_playtime_minutes` integer — required when type = `steam_playtime`.
- (Game is already implied via `challenges.game_id`, so we read `steam_app_id` through that join — no duplicate column.)

Validation trigger (not CHECK, per project rules) ensures the right column is set per type.

### 3. Task editor UI (admin/moderator)
In `CreateChallengeDialog` / `EditChallengeDialog` task rows:
- Show verification selector only if the parent challenge's game has a `steam_app_id`.
- `Steam achievement` → searchable picker fed by Steam `GetSchemaForGame` (new helper; same key as sync).
- `Steam playtime` → numeric "minutes required".
- Otherwise lock to `Manual upload`.

### 4. Auto-approval edge function: `verify-steam-task-completion`
Triggered when:
- A user opens a challenge task (lazy check), and
- On demand from `EvidenceUpload` ("Check Steam progress" button shown only for Steam-verified tasks when the user has `steam_id`).

Logic:
1. Load task → get `verification_type`, `challenge.game_id` → `games.steam_app_id`.
2. Run a fresh per-user/per-game Steam call (reusing the sync function's per-app code path; refactor that loop into a shared helper). Respect the 5-min per-user cooldown.
3. For `steam_achievement`: check `steam_player_achievements` row matches and `achieved = true`.
4. For `steam_playtime`: call `IPlayerService/GetOwnedGames` (new — currently unused) and compare `playtime_forever` (minutes) ≥ threshold. Cache the playtime in a new tiny `steam_player_playtime` table to avoid hammering the API.
5. On pass: insert a `challenge_evidence` row with `file_type='steam_auto'`, `file_url` pointing to a Steam profile / achievement permalink, plus auto-approve it (mirror moderator approval path so the existing point-deduction / completion triggers fire).

### 5. Player-facing UX in `EvidenceUpload`
When the task is Steam-verified:
- Top of dialog: "This task can auto-complete from your Steam account."
- If `profile.steam_id` is null → CTA to link Steam (existing flow).
- If linked → "Check Steam now" button → calls the new edge function → on success, closes dialog and shows toast; on miss, shows current progress (e.g., "0 / 120 minutes played") and still allows manual upload as a fallback.
- Manual `Upload File` / `Video Link` tabs remain available for any task (resilience for private profiles, Steam outages, or non-Steam games).

### 6. Guardrails
- Never auto-approve if game has no `steam_app_id` (fallback to manual).
- Never auto-approve if user has no `steam_id` linked.
- Private Steam profile → graceful message + manual fallback.
- Re-uses existing `should_notify` / completion triggers — no parallel approval path.

## Out of scope (call out for later)
- Backfilling `steam_app_id` on existing Steam games (admin tool, not auto).
- Pulling Steam stats other than achievements + playtime (e.g., per-stat thresholds like "kills > 100"). Possible v2 once `GetUserStatsForGame` is wired.
- Cross-store equivalents (Epic, Xbox, PlayStation).

## Technical notes

- `STEAM_API_KEY` secret already exists.
- New endpoints used: `IPlayerService/GetOwnedGames/v1` (playtime), `ISteamUserStats/GetSchemaForGame/v2` (achievement picker). Both keyed.
- Refactor `steam-achievement-sync/index.ts` to export a `syncUserGame(userId, steamId, appId)` helper consumed by both the bulk sync and the new verifier.
- New table `steam_player_playtime (user_id, steam_app_id, minutes_played, synced_at)` with the same RLS pattern as `steam_player_achievements`.
- Validation trigger on `challenge_tasks` enforces `verification_type` field consistency.
- All migrations idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) per project rules.
