

## Fix Three Security Vulnerabilities

### Finding 1: Unauthenticated Season Endpoints (Critical)

**Problem:** `award-season-points` and `rotate-season` accept requests with no auth checks.

**Fix:** Add JWT validation and role checks to both functions. Extract the bearer token, verify it with `getClaims()`, then check the caller has `admin` or `moderator` role in `user_roles`.

**Files:**
- `supabase/functions/award-season-points/index.ts` — add auth guard after CORS check
- `supabase/functions/rotate-season/index.ts` — add auth guard after CORS check

Both will:
1. Extract `Authorization` header, reject if missing
2. Create an anon-key client, call `getClaims(token)` to get `sub` (user ID)
3. Query `user_roles` (via service role client) to verify caller is `admin` or `moderator`
4. Return 403 if not authorized

All existing callers already use `supabase.functions.invoke()` which sends the JWT automatically, so no frontend changes needed.

---

### Finding 2: Public Ecosystem API Key (Critical)

**Problem:** `app_settings` table has `SELECT USING: true`, exposing the `ecosystem_api_key` to anonymous users.

**Fix:** Move the API key to a Supabase secret (`ECOSYSTEM_API_KEY`) and stop reading it from the database.

**Files:**
- `supabase/functions/ecosystem-data-api/index.ts` — replace `getOrCreateApiKey()` DB query with `Deno.env.get("ECOSYSTEM_API_KEY")`; return 500 if not configured
- `src/pages/admin/AdminEcosystem.tsx` — remove `fetchApiKey` DB query; replace with a masked display and a note that the key is managed as a backend secret. Remove the regenerate button (secrets are managed via backend settings). The copy button can invoke a new edge function or simply show a "managed via backend secrets" message.

**Secret:** Add `ECOSYSTEM_API_KEY` via the secrets tool with the current key value (user will need to paste it).

---

### Finding 3: Security Definer View (Medium)

**Problem:** `profiles_public` view uses `SECURITY DEFINER`, bypassing RLS.

**Fix:** This is intentional by design — the view only exposes non-sensitive columns (display_name, avatar, etc.) and is needed so users can see each other's profiles. Mark this finding as acknowledged/ignored since it's a deliberate design choice with appropriate column restriction.

---

### Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/award-season-points/index.ts` | Add JWT + role auth guard |
| `supabase/functions/rotate-season/index.ts` | Add JWT + role auth guard |
| `supabase/functions/ecosystem-data-api/index.ts` | Read API key from env secret instead of DB |
| `src/pages/admin/AdminEcosystem.tsx` | Remove direct key display; show "managed as backend secret" |
| New secret: `ECOSYSTEM_API_KEY` | Store the ecosystem API key securely |
| Security finding #3 | Mark as ignored (intentional design) |

