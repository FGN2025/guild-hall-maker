## Root cause

Each FGN.GG tool builds its Supabase client with `process.env.SUPABASE_PUBLISHABLE_KEY`. The Supabase Edge runtime injects `SUPABASE_URL` and `SUPABASE_ANON_KEY` — `SUPABASE_PUBLISHABLE_KEY` is Vite-only and is undefined here. `createClient(url, undefined)` throws, and mcp-js returns the generic `handler_error` / "tool execution failed" seen in logs (with `oauth.verify.ok` immediately before, confirming transport/OAuth are healthy).

## Changes

Edit only these five files:

- `src/lib/mcp/tools/get-me.ts`
- `src/lib/mcp/tools/list-tournaments.ts`
- `src/lib/mcp/tools/list-challenges.ts`
- `src/lib/mcp/tools/get-challenge.ts`
- `src/lib/mcp/tools/list-games.ts`

In each file:

1. `supabaseForUser` reads the anon key with a fallback:
   ```ts
   const url = process.env.SUPABASE_URL!;
   const anonKey =
     process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY!;
   return createClient(url, anonKey, {
     global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
     auth: { persistSession: false, autoRefreshToken: false },
   });
   ```
2. Wrap each handler body in `try/catch`; on catch, log and return the existing error shape:
   ```ts
   } catch (err: any) {
     console.error("[fgn-mcp] <tool_name> failed", err?.message, err?.stack);
     return { content: [{ type: "text", text: err?.message ?? "tool execution failed" }], isError: true };
   }
   ```
   Use `get_me`, `list_tournaments`, `list_challenges`, `get_challenge`, `list_games` per file.

## Guardrails

- No DB/RLS/schema changes.
- `verify_jwt` stays true; auth path unchanged.
- Tools remain read-only, run as calling user via forwarded bearer.
- Input schemas and output shapes preserved.

## After the edit

1. `app_mcp_server--extract_mcp_manifest`.
2. `supabase--deploy_edge_functions` with `["mcp"]`.

## Definition of done

`get_me`, `list_games`, `list_tournaments limit=5`, `list_challenges` (MSFS `game_id`, `is_active=true` → 6 rows; `is_active=false` non-mod → 0), and `get_challenge` on one id all return JSON (or a real RLS/permission message) — never a bare "tool execution failed".
