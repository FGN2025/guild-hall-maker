Fix `src/lib/mcp/tools/get-me.ts` so the `get_me` MCP tool returns a valid profile without hitting non-existent columns.

## What changed
- Update the `profiles` SELECT to only real columns:
  `id, user_id, display_name, discord_username, gamer_tag, avatar_url`
- Keep email sourced from `supabase.auth.getUser()` (already wired).
- Add lifetime/spendable points by summing the caller's rows in `season_scores`:
  - `points` = sum of `points`
  - `points_available` = sum of `points_available`
  - No row → 0 for both.
- Merge into the returned profile object:
  - Spread the profile row, then add `email`, `points`, `points_available`.
  - Fallback branch returns `{ id: userId, email, points, points_available }`.
- Preserve everything else exactly: `try/catch`, `console.error` tag, input schema `{}`, read-only annotations, and the `content` + `structuredContent: { profile }` return shape.

## Deployment steps
1. `app_mcp_server--extract_mcp_manifest` — refresh manifest (no signature change expected).
2. `supabase--deploy_edge_functions` with `["mcp"]`.

## Definition of done
`get_me` returns profile JSON with populated `email`, numeric `points` and `points_available`, and no `column ... does not exist` error.