

## Root cause

The current code is:
```tsx
{isAdmin && !isSubscribed && <TenantBillingCard />}
```

Two issues:
1. **No `roleLoading` guard** — during the brief window before `user_roles` resolves, `isAdmin` is `false` then flips. Also, on a stale cache the prior render can show the card. The "stack overflow" pattern flagged this exact bug.
2. **`isAdmin` alone is fragile** — it's true for Platform Admins even when they're not in tenant-switching mode. Using `isPlatformAdminMode` from `useTenantAdmin` makes the intent explicit ("Platform Admin viewing the tenant portal"), and naturally hides it from every Tenant Admin/Manager/Marketing user.

## Fix

**File:** `src/pages/tenant/TenantSettings.tsx`

1. Pull `roleLoading` from `useAuth()`.
2. Pull `isPlatformAdminMode` from `useTenantAdmin()`.
3. Replace the gate with a strict check that requires roles to be loaded AND the user to be a Platform Admin in tenant-switching mode:

```tsx
const { isAdmin, roleLoading } = useAuth();
const { tenantInfo, isPlatformAdminMode } = useTenantAdmin();
...
{!roleLoading && isAdmin && isPlatformAdminMode && !isSubscribed && (
  <TenantBillingCard />
)}
```

This guarantees:
- **Platform Admin in tenant mode** → sees the card (can subscribe on behalf of the tenant).
- **Tenant Admin / Manager / Marketing** → never sees the card (they're not `isAdmin`).
- **No flash** during initial role fetch.

## Verify no other entry points

Confirmed `TenantBillingCard` is only imported in `TenantSettings.tsx` (single usage). No other pages render it.

## Test
1. Sign in as Platform Admin → `/tenant/settings` → Billing card visible (if no active sub).
2. Sign in as Tenant Admin (no platform role) → `/tenant/settings` → no Billing card.
3. Sign in as Tenant Manager / Marketing → `/tenant/settings` → no Billing card.
4. Hard reload as a tenant-only user → no flash of the Billing card during role fetch.
5. After Platform Admin subscribes → card disappears (existing `!isSubscribed` behavior preserved).

