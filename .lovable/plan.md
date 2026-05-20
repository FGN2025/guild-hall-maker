## Continue Security Hardening

Pick up the four pending items from the previous security pass.

### 1. Use the safe purchases view in the client
- Update `src/hooks/useCloudGamingSeats.ts` to select from `subscriber_cloud_purchases_safe` instead of `subscriber_cloud_purchases`.
- Confirm no other component reads Stripe IDs from the original table; if it does, switch it to the safe view too.

### 2. Remove the pre-signup ban check from Auth
- In `src/pages/Auth.tsx`, drop the unauthenticated call to `check-ban-status` (the edge function is now admin-only and will reject it).
- Banned users are still blocked post-login by `AuthContext` / RLS, so the UX remains correct.

### 3. Harden AuthContext against localStorage role tampering
- Stop trusting any cached `role` / `is_admin` flag from `localStorage` or `sessionStorage`.
- Always derive roles from `user_roles` via Supabase on session load; treat client-side cache as a UI hint only, never as an authorization signal.
- Audit `src/contexts/AuthContext.tsx` (and any `useAuth`/role hooks) for reads of `localStorage` that feed role checks; remove or replace with server-verified state.

### 4. Update security finding statuses
- Mark as fixed: `legacy_users` PII, `tenant_sync_logs` exposure + realtime, `tenant_integrations.api_key_encrypted`, `subscriber_cloud_purchases` Stripe IDs, `media_library.user_id`, `tournaments` open write policies, and the four hardened edge functions (`assign-tournament-role`, `backfill-legacy-zips`, `backfill-zip-geo`, `check-ban-status`), plus items 1–3 above once shipped.
- Ignore (with reasons) any findings that are intentional (e.g. public read on landing-page content, anon access to `profiles_public` display fields).
- Refresh `security--update_memory` so the next scan knows what's intentional.

### Verification
- Cloud gaming seat UI still renders without Stripe IDs.
- `/auth` signup/login flow works for a fresh email and for a banned email (banned blocked after login, not before).
- A non-admin user cannot elevate to admin by editing `localStorage`.
- Re-run `security--run_security_scan` and confirm only intentional findings remain.

### Files expected to change
- `src/hooks/useCloudGamingSeats.ts`
- `src/pages/Auth.tsx`
- `src/contexts/AuthContext.tsx` (+ any role helper it depends on)
- Security findings + security memory (via tools, no code)
