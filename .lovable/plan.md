# Fix: Ninestar tenant admin can't see registered player details

## Root cause

I traced both issues against the live database for NineStar Connect (`e9c0f4b8-…`).

### 1. Why rows show "—" for name / gamer tag / email

The Players list in `useTenantPlayers` reads from `user_service_interests` (the "new leads" registry) and then tries to enrich each row from the `profiles_public` view.

- `user_service_interests` RLS: tenant admins can read rows where they are a tenant member ✅
- `profiles_public` is just a view over `profiles`. `profiles` RLS only allows: the owner, platform admins, and moderators. **Tenant admins are not granted access.**
- Result: every join returns `null`, so `display_name` and `gamer_tag` render as "—".
- Email is even worse — the hook hardcodes `email: null` and `address: null`. Email lives in `auth.users`, which the client cannot read at all.

Ninestar currently has 4 real registrations in `user_service_interests` (Dr Eville, db, GamerBrah21, DistantOne) plus 1 legacy match. Their profile rows do exist — the tenant admin just can't see them.

### 2. ZIP 46055

`validate-zip` works end-to-end right now — I called it directly and got `McCordsville, IN — 1 provider(s) found! → NineStar Connect`. The ZIP is correctly mapped in `tenant_zip_codes`. The "no providers" message the tenant saw was almost certainly a transient Smarty API failure: the function throws when Smarty returns non-200, and there is no fallback to our local `national_zip_codes` table (which is empty for 46055 anyway, so today the fallback wouldn't help even if it existed).

## Fix

### A. New security-definer RPC for tenant lead enrichment

Add `public.get_tenant_lead_players(_tenant_id uuid)` returning enriched lead rows. The function checks `is_tenant_member(_tenant_id, auth.uid())` (or `has_role(auth.uid(),'admin')`) before returning anything, and joins:

- `user_service_interests` (id, zip_code, status, created_at)
- `profiles` (display_name, gamer_tag, avatar_url)
- `auth.users` (email)

`SECURITY DEFINER`, `SET search_path = public`, granted to `authenticated`.

### B. Wire it into the UI

Replace the manual join in `src/hooks/useTenantPlayers.ts` (`leadsQuery`) with a single `supabase.rpc('get_tenant_lead_players', { _tenant_id: tenantId })` call, and map the returned rows into `UnifiedPlayer` so `name`, `gamerTag`, and `email` populate correctly.

No schema change to `user_service_interests` or `profiles`. No new RLS policy on `profiles` (we deliberately keep tenant admins out of the raw table — only the scoped RPC sees those rows).

### C. Harden `validate-zip` against Smarty outages

Update `supabase/functions/validate-zip/index.ts` so that when Smarty returns a non-OK status (or throws), we still call `lookup_providers_by_zip` and return `valid: true` with the providers and a generic "City lookup unavailable" note instead of bubbling up a 500. This way a transient Smarty hiccup never blocks a real Ninestar ZIP like 46055 from finding its provider.

### D. Verify

After deploy:
1. Sign in as Brian Dowden, open Players — Dr Eville / db / GamerBrah21 / DistantOne should show real display names, gamer tags, and emails.
2. Re-run `validate-zip` with `{"zipCode":"46055"}` → still returns NineStar Connect.
3. Simulate a Smarty failure (bad creds) → still returns the provider list with a soft warning, not a 500.

## Out of scope

- No changes to legacy_users flow (already shows correctly).
- No changes to `tenant_subscribers` (separate billing-sync registry, not the registration path).
- No changes to existing RLS on `profiles`.