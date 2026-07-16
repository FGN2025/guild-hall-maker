Fix the `get_me` MCP tool in `src/lib/mcp/tools/get-me.ts` only.

## Changes

1. **Match `profiles` on `user_id`, not `id`.**
   - Change `.eq("id", userId)` to `.eq("user_id", userId)`.
   - Keep `.select("id, user_id, display_name, discord_username, gamer_tag, avatar_url")` and `.maybeSingle()`.

2. **Return a consistent profile shape when no row exists.**
   - If `!data`, log: `console.warn("[fgn-mcp] get_me: no profiles row for user_id", userId);`
   - Build a fallback base object with explicit nulls:
     ```ts
     const profileBase = data ?? {
       id: userId,
       user_id: userId,
       display_name: null,
       discord_username: null,
       gamer_tag: null,
       avatar_url: null,
     };
     ```
   - Merge in `email`, `points`, and `points_available`:
     ```ts
     const profile = { ...profileBase, email, points, points_available };
     ```

3. **Preserve existing behavior.**
   - Email from `supabase.auth.getUser()`.
   - `points` and `points_available` summed from all caller `season_scores` rows.
   - `try/catch` with `console.error("[fgn-mcp] get_me failed", ...)`.
   - `inputSchema: {}`, read-only annotations, and `content` + `structuredContent: { profile }` return shape.

## Deployment

1. Run `app_mcp_server--extract_mcp_manifest` to refresh the manifest (no signature change expected).
2. Run `supabase--deploy_edge_functions` for `["mcp"]`.

## Definition of done

`get_me` returns a profile JSON with populated `display_name` and identity fields (`discord_username`, `gamer_tag`, `avatar_url`) alongside `email`, `points`, and `points_available`. If the account has no `profiles` row for its auth `user_id`, the tool returns the explicit null fallback shape and the edge log contains the new warning.