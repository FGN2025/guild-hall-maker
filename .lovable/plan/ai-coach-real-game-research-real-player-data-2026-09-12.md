# AI Coach: real game research + real player data

Short answer: yes. Drop Open Notebook as the required source of gameplay knowledge and replace it with two better inputs — live game research (Steam first, YouTube where a key is available) and the player's own recorded gameplay on the platform. Notebooks stay in the code but become optional and silent, so a stale password can never degrade an answer again.

## What changes for a player

Ask the coach about a game and the answer is built from:

1. What the game actually is right now — pulled live from Steam (description, genres/tags, achievement list, recent updates/news).
2. What that specific player has actually done — hours played, achievements earned vs. missing, match results, quests and challenges completed, season standing.
3. The coaching frameworks and game guide already in the app.

So instead of generic advice, the coach can say things like "you have 41 hours and 12 of 34 achievements; the three you're missing all involve X, here's a drill" — a true assessment tied to the question and the game.

## Sources

- **Steam (primary).** Already wired: `steam-game-schema`, `steam-achievement-sync`, `steam_player_achievements`, `steam_player_playtime`, and `games.steam_app_id`. Add a coach-side lookup for store details, global achievement rarity, and recent news for the active game.
- **Player gameplay (new).** Read-only aggregation of the signed-in user's rows: playtime, earned/missing achievements with rarity, recent `match_results`, `challenge_completions`, `quest_completions`, `season_scores`, plus the existing self-reported coach profile and uploads.
- **YouTube (optional, second pass).** Tutorial/VOD suggestions need a YouTube Data API key. If you want it, it gets requested as a secret; without it the coach simply omits video suggestions.
- **Discord.** Not used as a knowledge source — no reliable per-game corpus, and it risks surfacing private community content.
- **Open Notebook.** Downgraded to optional. If credentials are valid it adds passages; if not, nothing is logged as an error and the answer is unaffected.

## Technical detail

`supabase/functions/ai-coach/index.ts`:

- New `fetchGameResearch(game)` — Steam Store `appdetails`, `ISteamUserStats/GetSchemaForGame`, `GetGlobalAchievementPercentagesForApp`, and `ISteamNews` for `game.steam_app_id`; short TTL cache keyed by app id; hard timeout per call, failures degrade silently.
- New `fetchPlayerGameplay(userId, game)` — service-role reads scoped to that user across the tables listed above, filtered to the active game where a game link exists; produces a compact stats block (playtime, achievement completion %, notable missing achievements, last N match outcomes, challenge/quest progress).
- `searchNotebooks` stays but is skipped unless a connection is active *and* the password check passes; its failures downgrade to a single debug line.
- System prompt gains two labelled sections (Live Game Data, This Player's Record) and an instruction to ground assessments in the player's actual numbers, and to say plainly when no gameplay data exists yet.
- Prompt size guarded: research and player blocks each capped, oldest/least relevant trimmed first.

No schema changes, no writes, no changes to points, achievements, dispatch, approvals or the kill switch. Coach reads only.

## Open question

YouTube tutorial links require an API key — say the word and it gets requested, otherwise the first version ships Steam + player data only.
