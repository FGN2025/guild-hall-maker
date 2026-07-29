# Prize Shop: visible to all, redeemable by ISP-linked players

## Behavior
- Every signed-in player can open `/prize-shop`, browse prizes, see costs, stock, and their points wallet (unchanged).
- Only players linked to an ISP (a tenant) can submit a redemption. Linkage = `get_user_tenant(auth.uid())` returns a tenant, i.e. the user has a `tenant_subscribers` or `tenant_admins` row.
- Non-ISP players: a single banner at the top of the Shop tab explaining that redemptions are available to players with a participating internet provider, with a link to check their ZIP / find a provider. Prize cards and the Redeem button stay as-is otherwise; if they try to redeem, the server rejects it and the error surfaces as a toast.

## Database
Currently `prize_redemptions` INSERT policy has no restriction beyond being authenticated. Add a migration that:
- Drops the permissive insert policy and recreates it as: authenticated AND `auth.uid() = user_id` AND `public.get_user_tenant(auth.uid()) IS NOT NULL`.

This makes the rule authoritative server-side, so the UI banner is informational only and cannot be bypassed.

## Frontend
- New lightweight hook (e.g. `src/hooks/useIsIspLinked.ts`) calling the existing `get_user_tenant` RPC for the current user, cached via React Query.
- `src/pages/PrizeShop.tsx`: render the banner in the Shop tab when the hook resolves to no tenant. Keep the existing redeem mutation, but map an RLS rejection to a clear message ("Redemptions are limited to players with a participating internet provider") instead of the raw Postgres error.
- No routing changes: the page stays behind `ProtectedRoute` per your choice (signed-in players only).

## Not changing
- Prizes remain readable by any authenticated user (already the case) — no anon/guest access added.
- Points wallet, monthly caps, moderator approval flow, and points deduction triggers untouched.
