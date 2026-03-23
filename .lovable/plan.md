

## Fix Security Vulnerabilities

Two critical security issues identified by the scan need remediation.

---

### Finding 1: AI Coach & Notebook Proxy — Unauthenticated Access

**Problem**: Both `ai-coach` and `notebook-proxy` edge functions have zero authentication. Anyone can consume AI credits, query private knowledge bases, and stream completions anonymously.

**Fix**: Add JWT authentication guards to both functions.

**Steps**:

1. **`supabase/functions/ai-coach/index.ts`** — After the OPTIONS check, extract the `Authorization` header, create a Supabase client scoped to the caller, call `getClaims(token)` to verify identity, and return 401 if invalid. Pass `userId` through for potential rate-limiting later.

2. **`supabase/functions/notebook-proxy/index.ts`** — Same pattern: extract bearer token, validate via `getClaims(token)`, reject unauthenticated callers with 401. This protects notebook listing, search, ask, sources, and notes endpoints.

3. **Frontend impact**: Both functions are already called with `supabase.functions.invoke()` which automatically attaches the user's JWT — no frontend changes needed.

---

### Finding 2: Social Connection Tokens Readable by All Tenant Members

**Problem**: The `social_connections` table stores plaintext OAuth tokens. The RLS SELECT policy lets any tenant member read full rows including `access_token` and `refresh_token`, enabling token theft by co-admins.

**Fix**: Create a database view that hides sensitive token columns, and tighten the RLS policy.

**Steps**:

1. **Database migration** — Create a `social_connections_safe` view (SECURITY DEFINER) exposing only: `id`, `tenant_id`, `user_id`, `platform`, `account_name`, `page_id`, `is_active`, `token_expires_at`, `created_at`, `updated_at`. This is what the frontend already selects (confirmed in `useSocialConnections.ts` line 30).

2. **Tighten RLS on `social_connections`** — Replace the tenant-member SELECT policy with one restricted to `user_id = auth.uid()` OR admin role. Only the token owner and platform admins can read the full row (including tokens). The `publish-to-social` edge function already uses the service role key, so it bypasses RLS and is unaffected.

3. **Frontend** — Update `useSocialConnections.ts` to query from `social_connections_safe` view instead of the raw table. The selected columns already match, so this is a drop-in change.

---

### Summary

| Finding | Difficulty | Files Changed |
|---------|-----------|---------------|
| Auth guards on AI coach + notebook proxy | Easy | 2 edge functions |
| Token exposure fix | Medium | 1 migration + 1 hook |

