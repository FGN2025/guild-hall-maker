## Root cause

`list_tournaments` selected `game_id, tenant_id` — neither exists on `public.tournaments`. The live table uses `game` (text); start date is `start_date`, state is `status`. That's the "tool execution failed."

## Pre-flight checks (done)

- **Columns verified** against `information_schema.columns`:
  - `challenges` has `name`, `game_id`, `is_active`, `points_reward`, `created_at`. No `frequency`/`track`.
  - `challenge_tasks` has `title`, `description`, `display_order`, `verification_type`, `steam_achievement_api_name`, `steam_playtime_minutes`.
  - `games` has `id`, `name`, `slug`, `category`, `platform_tags`, `is_active`, `display_order`.
- **RLS verified** on all four tables. `tournaments` is open to authenticated. `challenges`, `challenge_tasks`, `games` gate SELECT on `is_active=true` for regular users; moderators/admins bypass via manage policies. The MSFS-inactive acceptance test therefore requires the caller has moderator or admin role — expected and documented in tool descriptions.

## Section A — Fix `list_tournaments`

Rewrite `src/lib/mcp/tools/list-tournaments.ts`:
- Select `id, name, game, status, start_date, end_date`.
- `.is("archived_at", null)` to match app behavior.
- Order `start_date` desc, honor `limit` (default 20, max 50).
- Response objects: `{ id, name, game, status, starts_at, ends_at }`.
- Comment excludes `ladders` and `tenant_events` as separate entities.

`get_me` untouched.

## Section B — Three new read-only tools

**`list-challenges.ts`** — Input `{ game_id?: uuid, is_active?: boolean, limit?: 1..100 default 25 }`. Select `id, name, game_id, is_active, points_reward, created_at`. Filters applied conditionally.

**`get-challenge.ts`** — Input `{ id: uuid }` required. Fetch challenge row (`select *`) + `challenge_tasks` (id, challenge_id, title, description, display_order, verification_type, steam_achievement_api_name, steam_playtime_minutes) ordered by `display_order`.

**`list-games.ts`** — Input `{ limit?: 1..100 default 50 }`. Select `id, name, slug, category, platform_tags, is_active, display_order` ordered by `display_order, name`.

Register all in `src/lib/mcp/index.ts`. Update instructions text.

## Guardrails

- No schema migrations. `verify_jwt` stays true. All read-only. Queries run as caller via forwarded bearer token.

## Post-edit

1. `app_mcp_server--extract_mcp_manifest` to regenerate manifest.
2. `supabase--deploy_edge_functions` for `["mcp"]`.
3. **Sanity test (built into verification):**
   - `list_challenges` with `game_id=7a78dd57-9061-47d3-9ee7-436a48aba2f6` and `is_active=false` → must return exactly 6 MSFS 2024 Flight-track challenges (all inactive). Requires caller be moderator/admin.
   - `get_challenge` on one of those six → returns tasks with `verification_type='manual'`.
   - `get_me` and `list_tournaments` return non-error JSON.

## Design note (kept for future readers)

Input asymmetry with the academy connector is intentional: play uses `game_id uuid` because `games` is a real catalog; academy uses `game_title` enum because its games live in `game_channels`. Do not harmonize.

## Final tool list

`get_me`, `list_tournaments`, `list_challenges`, `get_challenge`, `list_games`.
